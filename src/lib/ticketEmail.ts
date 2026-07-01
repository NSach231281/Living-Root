export interface TicketEmailData {
  name:        string;
  email:       string;
  eventTitle:  string;
  eventDate:   string;
  eventTime:   string;
  eventVenue:  string;
  seats:       number;
  ticketRef:   string;
  appUrl:      string;
  isPaid:      boolean;
  paymentRef?: string;
}

export function buildTicketEmail(d: TicketEmailData): { subject: string; html: string } {
  const subject = d.isPaid
    ? `🎟️ Booking received — ${d.eventTitle} | Living Root`
    : `✅ You're registered! ${d.eventTitle} | Living Root`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    `${d.appUrl}/ticket/${d.ticketRef}`
  )}&color=2C1810&bgcolor=F5F0E8`;

  const ticketUrl = `${d.appUrl}/ticket/${d.ticketRef}`;

  const statusBanner = d.isPaid
    ? `<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#92400E;">
        ⏳ <strong>Payment verification pending.</strong> We'll confirm once we verify your UPI ref: <strong>${d.paymentRef || "—"}</strong>. Usually within a few hours!
       </div>`
    : `<div style="background:#D1FAE5;border:1px solid #34D399;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#065F46;">
        ✅ <strong>You're all set!</strong> Show this ticket (or the QR code) at the door.
       </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

      <tr>
        <td align="center" style="padding-bottom:24px;">
          <div style="display:inline-flex;align-items:center;gap:8px;">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="18" fill="#2C1810"/>
              <path d="M18 8 C18 8 10 14 10 20 C10 25 13.5 28 18 28 C22.5 28 26 25 26 20 C26 14 18 8 18 8Z" fill="#C4622D"/>
              <path d="M18 15 L18 28 M14 19 C14 19 16 21 18 20 M22 19 C22 19 20 21 18 20" stroke="#F5F0E8" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#2C1810;letter-spacing:-0.5px;">Living Root</span>
          </div>
          <p style="margin:4px 0 0;font-family:sans-serif;font-size:12px;color:#9C8672;letter-spacing:2px;text-transform:uppercase;">Community · Connect · Grow</p>
        </td>
      </tr>

      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(44,24,16,0.12);">

            <tr>
              <td style="background:linear-gradient(135deg,#2C1810 0%,#8B5E3C 100%);padding:28px 32px;">
                <p style="margin:0 0 4px;font-family:sans-serif;font-size:11px;color:#D4A843;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">
                  ${d.isPaid ? "BOOKING RECEIVED" : "EVENT TICKET"}
                </p>
                <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;color:#F5F0E8;font-weight:bold;line-height:1.2;">
                  ${d.eventTitle}
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px;">
                ${statusBanner}

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="width:50%;padding-right:16px;vertical-align:top;">
                      <p style="margin:0 0 2px;font-family:sans-serif;font-size:10px;color:#9C8672;text-transform:uppercase;letter-spacing:2px;font-weight:bold;">Attendee</p>
                      <p style="margin:0;font-size:18px;font-weight:bold;color:#2C1810;">${d.name}</p>
                      <p style="margin:2px 0 0;font-size:13px;color:#8B5E3C;">${d.seats} seat${d.seats > 1 ? "s" : ""}</p>
                    </td>
                    <td style="width:50%;padding-left:16px;vertical-align:top;border-left:1px dashed #D4C4A8;">
                      <p style="margin:0 0 2px;font-family:sans-serif;font-size:10px;color:#9C8672;text-transform:uppercase;letter-spacing:2px;font-weight:bold;">Ticket Ref</p>
                      <p style="margin:0;font-family:'Courier New',monospace;font-size:18px;font-weight:bold;color:#C4622D;letter-spacing:2px;">${d.ticketRef}</p>
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background:#F5F0E8;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:6px 16px 6px 0;border-right:1px solid #D4C4A8;">
                      <p style="margin:0 0 2px;font-family:sans-serif;font-size:10px;color:#9C8672;text-transform:uppercase;letter-spacing:1.5px;">Date</p>
                      <p style="margin:0;font-size:15px;font-weight:bold;color:#2C1810;">📅 ${d.eventDate}</p>
                    </td>
                    <td style="padding:6px 16px;border-right:1px solid #D4C4A8;">
                      <p style="margin:0 0 2px;font-family:sans-serif;font-size:10px;color:#9C8672;text-transform:uppercase;letter-spacing:1.5px;">Time</p>
                      <p style="margin:0;font-size:15px;font-weight:bold;color:#2C1810;">⏰ ${d.eventTime}</p>
                    </td>
                    <td style="padding:6px 0 6px 16px;">
                      <p style="margin:0 0 2px;font-family:sans-serif;font-size:10px;color:#9C8672;text-transform:uppercase;letter-spacing:1.5px;">Venue</p>
                      <p style="margin:0;font-size:15px;font-weight:bold;color:#2C1810;">📍 ${d.eventVenue}</p>
                    </td>
                  </tr>
                </table>

                <div style="border-top:2px dashed #D4C4A8;margin:0 -32px 24px;position:relative;">
                  <span style="position:absolute;left:-14px;top:-10px;width:20px;height:20px;background:#F5F0E8;border-radius:50%;display:inline-block;"></span>
                  <span style="position:absolute;right:-14px;top:-10px;width:20px;height:20px;background:#F5F0E8;border-radius:50%;display:inline-block;"></span>
                </div>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <p style="margin:0 0 12px;font-family:sans-serif;font-size:11px;color:#9C8672;text-transform:uppercase;letter-spacing:2px;">Scan to verify entry</p>
                      <a href="${ticketUrl}">
                        <img src="${qrUrl}" width="130" height="130" alt="Ticket QR Code"
                          style="border:6px solid #F5F0E8;border-radius:8px;display:block;margin:0 auto;"/>
                      </a>
                      <p style="margin:10px 0 0;font-family:sans-serif;font-size:11px;color:#9C8672;">
                        Or visit: <a href="${ticketUrl}" style="color:#C4622D;">${ticketUrl}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#2C1810;padding:16px 32px;text-align:center;">
                <p style="margin:0;font-family:sans-serif;font-size:11px;color:#9C8672;">
                  📍 Living Root, JP Nagar 5th Phase, Bengaluru · 
                  <a href="https://wa.me/919845054981" style="color:#D4A843;text-decoration:none;">WhatsApp us</a> for queries
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>

      <tr>
        <td align="center" style="padding:20px 0;">
          <p style="margin:0;font-family:sans-serif;font-size:12px;color:#9C8672;">
            Questions? Reach out on <a href="https://wa.me/919845054981" style="color:#C4622D;text-decoration:none;">WhatsApp</a> or 
            <a href="mailto:hello@livingrootspace.com" style="color:#C4622D;text-decoration:none;">email us</a>
          </p>
          <p style="margin:6px 0 0;font-family:sans-serif;font-size:11px;color:#D4C4A8;">
            © Living Root Space, JP Nagar, Bengaluru
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}
