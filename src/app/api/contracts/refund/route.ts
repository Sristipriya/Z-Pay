import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { refundEscrow, releaseEscrow } from '@/lib/escrow';

// Auto-release window: freelancer can claim funds this many days after delivery
// without even needing to dispute — if client never responds.
const AUTO_RELEASE_DAYS = 7;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contract_id, pin } = await request.json();

  if (!contract_id) {
    return NextResponse.json({ error: 'Contract ID required' }, { status: 400 });
  }

  const { data: contract } = await supabaseAdmin
    .from('contracts')
    .select('*')
    .eq('id', contract_id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  const isPayer      = contract.payer_id      === user.id;
  const isFreelancer = contract.freelancer_id === user.id;

  if (!isPayer && !isFreelancer) {
    return NextResponse.json({ error: 'You are not a party to this contract' }, { status: 403 });
  }

  if (['released', 'refunded'].includes(contract.status)) {
    return NextResponse.json({ error: `Contract already ${contract.status}` }, { status: 400 });
  }

  const isExpired  = contract.expiry_timestamp && (Date.now() / 1000) > contract.expiry_timestamp;
  const isDisputed = contract.status === 'disputed';

  // ── Layer 2: Auto-release timeout ────────────────────────────────────────
  // If freelancer delivered and client has NOT responded for AUTO_RELEASE_DAYS,
  // the freelancer can claim funds directly — no dispute needed.
  const deliveredAt       = contract.delivered_at ? new Date(contract.delivered_at).getTime() : null;
  const daysSinceDelivery = deliveredAt ? (Date.now() - deliveredAt) / (1000 * 60 * 60 * 24) : 0;
  const isAutoReleaseEligible =
    isFreelancer &&
    contract.status === 'delivered' &&
    daysSinceDelivery >= AUTO_RELEASE_DAYS;

  // ── Payer refund rules ────────────────────────────────────────────────────
  if (isPayer) {
    if (!isExpired && !isDisputed) {
      return NextResponse.json({
        error: 'Can only refund if contract is disputed or has expired'
      }, { status: 400 });
    }

    // Freelancer raised the dispute → arbiter must decide
    if (isDisputed && contract.disputed_by === 'freelancer') {
      return NextResponse.json({
        error: 'This dispute was raised by the freelancer. An arbiter must resolve it.'
      }, { status: 403 });
    }

    // ── Layer 1: Bad-faith client guard ──────────────────────────────────
    // Payer raised a dispute AFTER work was already delivered.
    // They could be trying to get the work for free.
    // Block self-refund — this MUST go through an arbiter.
    if (isDisputed && contract.disputed_by === 'payer' && contract.dispute_after_delivery === true) {
      return NextResponse.json({
        error: `You disputed this contract after the freelancer had already delivered the work. 
To prevent abuse, you cannot self-refund in this case. 
An arbiter will review the evidence and decide. Contact support@expopay.app with your dispute reason.`
      }, { status: 403 });
    }
  }

  // ── Freelancer claim rules ────────────────────────────────────────────────
  if (isFreelancer) {
    // Layer 2: Auto-release — no dispute needed after 7 days
    if (isAutoReleaseEligible) {
      // Allowed — falls through to release below
    } else if (!isDisputed) {
      return NextResponse.json({
        error: `You can claim funds either after ${AUTO_RELEASE_DAYS} days of no response, or after raising a dispute.`
      }, { status: 400 });
    } else if (contract.disputed_by !== 'freelancer') {
      return NextResponse.json({
        error: 'This dispute was raised by the client. An arbiter will resolve it.'
      }, { status: 403 });
    }
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!callerProfile?.stellar_secret) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  // PIN check (payer only, for refunds)
  if (isPayer && callerProfile.app_pin) {
    if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 });
    if (callerProfile.app_pin !== pin) return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  try {
    if (isPayer) {
      // Payer: legitimate refund (they disputed before delivery, or contract expired)
      const txHash = await refundEscrow(Number(contract.escrow_id), callerProfile.stellar_secret);

      const { error: refundError } = await supabaseAdmin
        .from('contracts')
        .update({ status: 'refunded', refunded_at: new Date().toISOString(), tx_hash_refund: txHash })
        .eq('id', contract_id);

      if (refundError) throw new Error(`DB Error: ${refundError.message}`);

      return NextResponse.json({
        success: true,
        tx_hash: txHash,
        message: 'Refund processed. Funds returned to your wallet.'
      });

    } else {
      // Freelancer: auto-release after timeout OR dispute they raised
      // CRITICAL FIX: The on-chain smart contract mandates that `release` can ONLY be signed by the payer.
      // Since this is an auto-claim, the freelancer is initiating it, but the tx will trap and fail on-chain.
      // Because this platform is custodial (stores stellar_secret), the backend must sign on behalf of the payer.
      const { data: payerProfile } = await supabaseAdmin
        .from('profiles')
        .select('stellar_secret')
        .eq('id', contract.payer_id)
        .single();

      if (!payerProfile?.stellar_secret) {
        return NextResponse.json({ error: "Payer's wallet not found. Cannot auto-release on-chain." }, { status: 500 });
      }

      const isAutoRelease = isAutoReleaseEligible && !isDisputed;
      const txHash        = await releaseEscrow(Number(contract.escrow_id), payerProfile.stellar_secret);

      await supabaseAdmin
        .from('contracts')
        .update({
          status:       'released',
          released_at:  new Date().toISOString(),
          tx_hash_release: txHash,
        })
        .eq('id', contract_id);

      await supabaseAdmin
        .from('transactions')
        .insert({
          sender_id:              contract.payer_id,
          recipient_id:           contract.freelancer_id,
          sender_universal_id:    contract.payer_universal_id,
          recipient_universal_id: contract.freelancer_universal_id,
          amount:                 contract.amount,
          currency:               contract.currency,
          tx_hash:                txHash,
          status:                 'completed',
          note: isAutoRelease
            ? `Auto-Released (${AUTO_RELEASE_DAYS}d no response): ${contract.title}`
            : `Dispute Resolved (Freelancer Claim): ${contract.title}`,
          purpose: 'Contract Release',
        });

      return NextResponse.json({
        success: true,
        tx_hash: txHash,
        message: isAutoRelease
          ? `Auto-release triggered. Client didn't respond in ${AUTO_RELEASE_DAYS} days. Funds released to your wallet!`
          : 'Dispute resolved. Funds released to your wallet.'
      });
    }
  } catch (error: any) {
    console.error('Refund/claim error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process' }, { status: 500 });
  }
}
