import { supabase } from '../supabaseClient'

export async function sendEmail(to, subject, html) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html }
    })
    if (error) console.error('Email send error:', error)
    return { success: !error, data }
  } catch (err) {
    console.error('Email error:', err)
    return { success: false, error: err }
  }
}

// ===== Email Templates =====

const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; color: #1B3A6B; line-height: 1.6;`

const buttonStyle = `display: inline-block; background: linear-gradient(135deg, #0A7E8C 0%, #065F6B 100%); color: white !important; padding: 0.85rem 1.75rem; text-decoration: none; border-radius: 10px; font-weight: 600; margin: 1rem 0;`

const footerStyle = `color: #94A3B8; font-size: 0.85rem; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #E2E8F0;`

export function welcomeNurseEmail(firstName) {
  return {
    subject: '⚡ Welcome to Flexprn!',
    html: `
      <div style="${baseStyle}">
        <h1 style="color: #1B3A6B;">Welcome to Flexprn, ${firstName}!</h1>
        <p>You're now part of the platform that puts nurses in control of their PRN careers — no agency middleman, transparent pay, total schedule control.</p>
        <h2 style="color: #0A7E8C; font-size: 1.2rem;">Get started in 4 steps:</h2>
        <ol>
          <li>Complete your profile (specialties, certifications, bio)</li>
          <li>Upload your resume and credentials</li>
          <li>Set up direct deposit for payments</li>
          <li>Apply to facilities you'd like to work for</li>
        </ol>
        <p><strong>Heads up:</strong> Your profile must reach 80% complete before you can apply to shifts.</p>
        <a href="https://flexprn.com/nurse/profile" style="${buttonStyle}">Complete Your Profile →</a>
        <p style="${footerStyle}">Questions? Reply to this email anytime.<br>— The Flexprn Team</p>
      </div>
    `
  }
}

export function welcomeFacilityEmail(facilityName, contactName) {
  return {
    subject: `⚡ Welcome to Flexprn, ${facilityName}!`,
    html: `
      <div style="${baseStyle}">
        <h1 style="color: #1B3A6B;">Welcome aboard, ${contactName}!</h1>
        <p><strong>${facilityName}</strong> is now registered on Flexprn. You're about to cut staffing costs by 30-45%.</p>
        <h2 style="color: #0A7E8C; font-size: 1.2rem;">First steps:</h2>
        <ol>
          <li>Verify your facility address (required for GPS clock-in)</li>
          <li>Post your first shift to test the platform</li>
          <li>Review nurse applications and build your float pool</li>
          <li>Use "Find Staff" to recruit pre-vetted nurses</li>
        </ol>
        <a href="https://flexprn.com/facility/profile" style="${buttonStyle}">Verify Your Address →</a>
        <p style="${footerStyle}">Need help? Reply anytime.<br>— The Flexprn Team</p>
      </div>
    `
  }
}

export function shiftAcceptedEmail(nurseName, shiftDate, unit, startTime) {
  return {
    subject: `✓ Shift filled by ${nurseName}`,
    html: `
      <div style="${baseStyle}">
        <h1 style="color: #15803D;">Your shift is filled!</h1>
        <p><strong>${nurseName}</strong> just accepted your ${unit} shift on <strong>${new Date(shiftDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong> at ${startTime}.</p>
        <a href="https://flexprn.com/facility/dashboard" style="${buttonStyle}">View Shift Details →</a>
        <p style="${footerStyle}">— The Flexprn Team</p>
      </div>
    `
  }
}

export function invitationReceivedEmail(nurseName, facilityName, message) {
  return {
    subject: `${facilityName} wants you in their float pool!`,
    html: `
      <div style="${baseStyle}">
        <h1 style="color: #1B3A6B;">${nurseName}, you've been invited!</h1>
        <p><strong>${facilityName}</strong> reviewed your profile on Flexprn and wants you in their float pool — no application needed, just accept.</p>
        ${message ? `<blockquote style="border-left: 4px solid #0A7E8C; padding: 0.75rem 1rem; color: #475569; margin: 1.25rem 0; background: #F0F7F9; border-radius: 0 8px 8px 0;">${message}</blockquote>` : ''}
        <a href="https://flexprn.com/nurse/shifts" style="${buttonStyle}">View Invitation →</a>
        <p style="${footerStyle}">— The Flexprn Team</p>
      </div>
    `
  }
}

export function newShiftPostedEmail(nurseName, facilityName, shiftDate, unit, payRate) {
  return {
    subject: `New shift at ${facilityName} — $${payRate}/hr`,
    html: `
      <div style="${baseStyle}">
        <h1 style="color: #1B3A6B;">New shift available for you!</h1>
        <p>${nurseName}, <strong>${facilityName}</strong> just posted a new shift you're eligible for:</p>
        <ul>
          <li><strong>Unit:</strong> ${unit}</li>
          <li><strong>Date:</strong> ${new Date(shiftDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</li>
          <li><strong>Pay:</strong> $${payRate}/hour</li>
        </ul>
        <p>First come, first served — accept before someone else does.</p>
        <a href="https://flexprn.com/nurse/shifts" style="${buttonStyle}">View Shift →</a>
        <p style="${footerStyle}">— The Flexprn Team</p>
      </div>
    `
  }
}