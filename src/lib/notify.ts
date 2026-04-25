/**
 * notify.ts — Universal server-side notification utility for ExpoPay
 * Handles transactional emails via Resend for all platform events.
 * In-app toasts are handled client-side via PaymentNotification.tsx + contracts realtime.
 */

import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'ExpoPay <noreply@exporouter.site>';
const DOMAIN = 'https://exporouter.site';

// ─── Shared HTML shell ────────────────────────────────────────────────────────
function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ExpoPay</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;min-height:100vh;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111113;border:1px solid #27272a;border-radius:20px;overflow:hidden;">
        <!-- TOP GRADIENT BAR -->
        <tr><td style="height:3px;background:linear-gradient(90deg,#C694F9,#F5A7C4,#94A1F9);"></td></tr>
        <!-- LOGO -->
        <tr><td style="padding:32px 40px 0;">
          <span style="font-size:22px;font-weight:900;letter-spacing:2px;color:#fff;">EXPO<span style="color:#C694F9;">PAY</span></span>
        </td></tr>
        <!-- CONTENT -->
        <tr><td style="padding:28px 40px 40px;">
          ${content}
        </td></tr>
        <!-- FOOTER -->
        <tr><td style="padding:24px 40px;border-top:1px solid #27272a;">
          <p style="margin:0;font-size:11px;color:#52525b;line-height:1.6;">
            You are receiving this because you have an active ExpoPay account.<br/>
            © 2026 ExpoPay. All rights reserved. &nbsp;|&nbsp;
            <a href="${DOMAIN}" style="color:#71717a;text-decoration:none;">exporouter.site</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Reusable amount badge ────────────────────────────────────────────────────
function amountBadge(amount: number, currency: string, color = '#C694F9'): string {
  return `<div style="display:inline-block;background:#1c1c1f;border:1px solid #27272a;border-radius:12px;padding:12px 24px;margin:16px 0;">
    <span style="font-size:28px;font-weight:900;color:${color};">${amount.toFixed(2)} ${currency}</span>
  </div>`;
}

// ─── Reusable info row ────────────────────────────────────────────────────────
function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#71717a;font-size:13px;width:140px;">${label}</td>
    <td style="padding:8px 0;color:#e4e4e7;font-size:13px;font-weight:600;">${value}</td>
  </tr>`;
}

// ─── Helper: fetch user email by userId ──────────────────────────────────────
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

// ─── Helper: fetch profile ───────────────────────────────────────────────────
async function getProfile(userId: string): Promise<{ full_name: string; universal_id: string } | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name, universal_id')
    .eq('id', userId)
    .single();
  return data;
}

// ─── Send helper ─────────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await resend.emails.send({ from: FROM, to: [to], subject, html });
  } catch (err) {
    console.error('[notify] Resend error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/** Welcome email fired after onboarding completes */
export async function notifyWelcome(userId: string, username: string, fullName: string) {
  const email = await getUserEmail(userId);
  if (!email) return;

  const html = emailShell(`
    <h2 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#fff;">
      Welcome, ${fullName || username}! 🎉
    </h2>
    <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Your ExpoPay account is active and ready to use.</p>

    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:.1em;">Your Expo ID</p>
      <p style="margin:0;font-size:22px;font-weight:900;color:#C694F9;">@${username}</p>
    </div>

    <h3 style="color:#fff;font-size:15px;font-weight:700;margin:0 0 12px;">What you can do right now:</h3>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:28px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #27272a;">
        <span style="color:#C694F9;font-weight:700;">🚀 Send & Receive</span>
        <span style="color:#71717a;font-size:13px;display:block;margin-top:2px;">Instant global payments to any @expo ID</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #27272a;">
        <span style="color:#C694F9;font-weight:700;">🔐 Escrow Contracts</span>
        <span style="color:#71717a;font-size:13px;display:block;margin-top:2px;">Create trustless smart contracts for freelance work</span>
      </td></tr>
      <tr><td style="padding:8px 0;">
        <span style="color:#C694F9;font-weight:700;">📊 Transaction History</span>
        <span style="color:#71717a;font-size:13px;display:block;margin-top:2px;">Full audit trail of every payment on the Stellar blockchain</span>
      </td></tr>
    </table>

    <a href="${DOMAIN}/dashboard" style="display:inline-block;background:#C694F9;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:50px;text-decoration:none;">
      Open Dashboard →
    </a>
  `);

  await sendEmail(email, `Welcome to ExpoPay, ${fullName || username}! 🚀`, html);
}

/** P2P payment sent/received */
export async function notifyPayment(opts: {
  senderId: string;
  recipientId: string;
  senderUniversalId: string;
  recipientUniversalId: string;
  amount: number;
  currency: string;
  txHash: string;
  note?: string;
}) {
  const { senderId, recipientId, senderUniversalId, recipientUniversalId, amount, currency, txHash, note } = opts;
  const ts = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });

  const [senderEmail, recipientEmail] = await Promise.all([
    getUserEmail(senderId),
    getUserEmail(recipientId),
  ]);

  const rows = `
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:20px 0;">
      ${infoRow('Date', ts + ' UTC')}
      ${infoRow('Reference', txHash.slice(0, 16) + '...')}
      ${note ? infoRow('Note', note) : ''}
    </table>`;

  // Email to sender
  if (senderEmail) {
    const html = emailShell(`
      <p style="margin:0 0 4px;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:.1em;">Payment Sent</p>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#fff;">You sent a payment</h2>
      ${amountBadge(amount, currency, '#F5A7C4')}
      <p style="color:#71717a;font-size:14px;margin:4px 0 0;">To <strong style="color:#e4e4e7;">@${recipientUniversalId}</strong></p>
      ${rows}
      <a href="${DOMAIN}/dashboard/history" style="display:inline-block;background:#18181b;color:#fff;font-size:13px;font-weight:600;padding:10px 24px;border-radius:50px;text-decoration:none;border:1px solid #27272a;">View Transaction</a>
    `);
    await sendEmail(senderEmail, `You sent ${amount.toFixed(2)} ${currency} on ExpoPay`, html);
  }

  // Email to recipient
  if (recipientEmail) {
    const html = emailShell(`
      <p style="margin:0 0 4px;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:.1em;">Payment Received</p>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#fff;">You received a payment!</h2>
      ${amountBadge(amount, currency, '#86efac')}
      <p style="color:#71717a;font-size:14px;margin:4px 0 0;">From <strong style="color:#e4e4e7;">@${senderUniversalId}</strong></p>
      ${rows}
      <a href="${DOMAIN}/dashboard" style="display:inline-block;background:#C694F9;color:#000;font-size:13px;font-weight:900;padding:10px 24px;border-radius:50px;text-decoration:none;">View Dashboard</a>
    `);
    await sendEmail(recipientEmail, `You received ${amount.toFixed(2)} ${currency} on ExpoPay 💰`, html);
  }
}

/** Escrow event notifications */
export type EscrowEvent =
  | 'created'
  | 'funded'
  | 'delivered'
  | 'released'
  | 'disputed'
  | 'resolved_freelancer'
  | 'resolved_client'
  | 'refunded'
  | 'cancelled';

const ESCROW_EVENT_META: Record<EscrowEvent, { label: string; tagline: string; color: string; emoji: string }> = {
  created:             { label: 'Contract Created',            tagline: 'A new escrow contract has been created for you.',                   color: '#C694F9', emoji: '📋' },
  funded:              { label: 'Contract Funded',             tagline: 'Funds have been deposited into escrow and are locked on-chain.',    color: '#94A1F9', emoji: '💰' },
  delivered:           { label: 'Work Marked as Delivered',    tagline: 'The freelancer has marked the work as delivered. Please review.',   color: '#fb923c', emoji: '📦' },
  released:            { label: 'Funds Released',              tagline: 'The payer has approved the work and released funds to you.',        color: '#86efac', emoji: '✅' },
  disputed:            { label: 'Dispute Raised',              tagline: 'A dispute has been raised on this contract. An arbiter will review.',color: '#f87171', emoji: '⚠️' },
  resolved_freelancer: { label: 'Dispute Resolved — Paid',     tagline: 'The arbiter has resolved the dispute in favor of the freelancer.',  color: '#86efac', emoji: '⚖️' },
  resolved_client:     { label: 'Dispute Resolved — Refunded', tagline: 'The arbiter has resolved the dispute in favor of the client.',      color: '#94A1F9', emoji: '⚖️' },
  refunded:            { label: 'Contract Refunded',           tagline: 'Funds have been returned to the client.',                          color: '#94A1F9', emoji: '↩️' },
  cancelled:           { label: 'Contract Cancelled',          tagline: 'The contract has been cancelled.',                                  color: '#71717a', emoji: '🚫' },
};

export async function notifyEscrow(opts: {
  event: EscrowEvent;
  contractTitle: string;
  amount: number;
  currency: string;
  payerId: string;
  freelancerId: string;
  payerUniversalId: string;
  freelancerUniversalId: string;
  txHash?: string;
  notifyParties?: ('payer' | 'freelancer' | 'both');
}) {
  const {
    event, contractTitle, amount, currency,
    payerId, freelancerId, payerUniversalId, freelancerUniversalId,
    txHash, notifyParties = 'both',
  } = opts;

  const meta = ESCROW_EVENT_META[event];
  const ts = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });

  const makeHtml = (recipientRole: 'payer' | 'freelancer') => {
    const counterparty = recipientRole === 'payer' ? freelancerUniversalId : payerUniversalId;
    const roleLabel = recipientRole === 'payer' ? 'Client' : 'Freelancer';

    return emailShell(`
      <p style="margin:0 0 4px;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:.1em;">${meta.emoji} Escrow Update</p>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:${meta.color};">${meta.label}</h2>
      <p style="color:#71717a;font-size:14px;margin:0 0 20px;">${meta.tagline}</p>

      <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:.1em;">Contract</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#e4e4e7;">${contractTitle}</p>
      </div>

      ${amountBadge(amount, currency, meta.color)}

      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${infoRow('Your Role', roleLabel)}
        ${infoRow('Counterparty', '@' + counterparty)}
        ${infoRow('Date', ts + ' UTC')}
        ${txHash ? infoRow('Tx Hash', txHash.slice(0, 20) + '...') : ''}
      </table>

      <a href="${DOMAIN}/dashboard/contracts" style="display:inline-block;background:#C694F9;color:#000;font-size:13px;font-weight:900;padding:10px 24px;border-radius:50px;text-decoration:none;">
        View Contract →
      </a>
    `);
  };

  const subject = `${meta.emoji} ${meta.label} — ${contractTitle}`;

  const promises: Promise<void>[] = [];

  if (notifyParties === 'payer' || notifyParties === 'both') {
    promises.push(
      getUserEmail(payerId).then(e => e ? sendEmail(e, subject, makeHtml('payer')) : undefined)
    );
  }
  if (notifyParties === 'freelancer' || notifyParties === 'both') {
    promises.push(
      getUserEmail(freelancerId).then(e => e ? sendEmail(e, subject, makeHtml('freelancer')) : undefined)
    );
  }

  await Promise.allSettled(promises);
}

/** Security event (login, password change, PIN change) */
export async function notifySecurityEvent(userId: string, eventType: 'new_login' | 'password_changed' | 'pin_changed') {
  const email = await getUserEmail(userId);
  if (!email) return;

  const meta = {
    new_login:        { label: 'New Login Detected',    desc: 'A new sign-in was detected on your ExpoPay account.', emoji: '🔐', color: '#fb923c' },
    password_changed: { label: 'Password Changed',       desc: 'Your ExpoPay account password was successfully changed.', emoji: '🔑', color: '#C694F9' },
    pin_changed:      { label: 'PIN Updated',            desc: 'Your transaction PIN has been successfully changed.', emoji: '🔢', color: '#94A1F9' },
  }[eventType];

  const ts = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });

  const html = emailShell(`
    <p style="margin:0 0 4px;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:.1em;">${meta.emoji} Security Alert</p>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:${meta.color};">${meta.label}</h2>
    <p style="color:#71717a;font-size:14px;margin:0 0 20px;">${meta.desc}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${infoRow('Time', ts + ' UTC')}
    </table>
    <p style="color:#71717a;font-size:13px;margin:20px 0 0;">
      If this wasn't you, please 
      <a href="${DOMAIN}/auth/forgot-password" style="color:#C694F9;">reset your password immediately</a>.
    </p>
  `);

  await sendEmail(email, `${meta.emoji} ExpoPay Security: ${meta.label}`, html);
}
