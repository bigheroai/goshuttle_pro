import React from 'react';

/**
 * BookingEmailTemplate
 * Renders a pixel-perfect, inline-styled HTML email template
 * suitable for both browser preview and actual email sending.
 */
export default function BookingEmailTemplate({ config = {}, booking = {} }) {
  const {
    companyName = 'GoShuttle Pro',
    companyTagline = 'Your Trusted Transportation Partner',
    primaryColor = '#0ea5e9',
    accentColor = '#0369a1',
    headerTitle = 'Booking Confirmed!',
    headerSubtitle = 'Your shuttle has been reserved',
    showBookingCode = true,
    showTripDetails = true,
    showDriverContact = true,
    showPickupInstructions = true,
    showPaymentInfo = true,
    showSupportContact = true,
    pickupInstructions = [],
    supportPhone = '+63 2 8888 4567',
    supportEmail = 'support@goshuttle.ph',
    supportWebsite = 'www.goshuttle.ph',
    footerNote = 'This is an automated confirmation. Please do not reply to this email.',
  } = config;

  const {
    bookingCode,
    bookingId,
    customerName = 'Valued Customer',
    pickupLocation,
    dropoffLocation,
    pickupDate,
    pickupTime,
    passengerCount = 1,
    vehicleName,
    vehicleType,
    driverName,
    driverPhone,
    driverLicensePlate,
    driverRating,
    totalAmount,
    paymentMethod,
    paymentStatus,
    specialRequests,
  } = booking;

  const containerStyle = {
    fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  };

  const headerStyle = {
    background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
    padding: '36px 32px',
    textAlign: 'center',
    color: '#ffffff',
  };

  const sectionStyle = {
    padding: '24px 32px',
    borderBottom: '1px solid #f1f5f9',
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#94a3b8',
    marginBottom: '4px',
  };

  const valueStyle = {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '500',
  };

  const badgeStyle = {
    display: 'inline-block',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 12px',
    borderRadius: '20px',
    letterSpacing: '0.05em',
  };

  const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '10px 0',
    borderBottom: '1px solid #f8fafc',
  };

  return (
    <div style={containerStyle}>
      {/* ── HEADER ── */}
      <div style={headerStyle}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🚐</div>
        <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          {companyName}
        </div>
        <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '16px' }}>{companyTagline}</div>
        <div style={{ fontSize: '26px', fontWeight: '700', marginBottom: '6px' }}>{headerTitle}</div>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>{headerSubtitle}</div>
        <div style={{ marginTop: '16px' }}>
          <span style={badgeStyle}>✓ CONFIRMED</span>
        </div>
      </div>
      {/* ── GREETING ── */}
      <div style={{ padding: '24px 32px 0', backgroundColor: '#f8fafc' }}>
        <p style={{ fontSize: '15px', color: '#334155', margin: 0 }}>
          Hi <strong>{customerName}</strong>,
        </p>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '6px', marginBottom: '0' }}>
          Your booking is confirmed. Here are all the details you need for your trip.
        </p>
      </div>
      {/* ── BOOKING CODE ── */}
      {showBookingCode && bookingCode && (
        <div style={{ padding: '20px 32px', backgroundColor: '#f8fafc' }}>
          <div style={{
            background: `linear-gradient(135deg, ${primaryColor}15, ${accentColor}10)`,
            border: `2px solid ${primaryColor}40`,
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
              Your Booking Code
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '0.15em', color: accentColor, fontFamily: 'monospace' }}>
              {bookingCode}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              Save this code to track or modify your booking
            </div>
            {bookingId && (
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                Ref: #{bookingId?.substring(0, 8)?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── TRIP DETAILS ── */}
      {showTripDetails && (
        <div style={sectionStyle}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: primaryColor }}>📍</span> Trip Details
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Pickup */}
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '14px', borderLeft: `3px solid #22c55e` }}>
              <div style={labelStyle}>Pickup</div>
              <div style={{ ...valueStyle, fontSize: '13px' }}>{pickupLocation || '—'}</div>
            </div>

            {/* Drop-off */}
            <div style={{ backgroundColor: '#fef2f2', borderRadius: '8px', padding: '14px', borderLeft: `3px solid #f87171` }}>
              <div style={labelStyle}>Drop-off</div>
              <div style={{ ...valueStyle, fontSize: '13px' }}>{dropoffLocation || '—'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div>
              <div style={labelStyle}>Date</div>
              <div style={valueStyle}>{pickupDate || '—'}</div>
            </div>
            <div>
              <div style={labelStyle}>Time</div>
              <div style={{ ...valueStyle, color: primaryColor, fontWeight: '700' }}>{pickupTime || '—'}</div>
            </div>
            <div>
              <div style={labelStyle}>Passengers</div>
              <div style={valueStyle}>{passengerCount} pax</div>
            </div>
          </div>

          {(vehicleName || vehicleType) && (
            <div style={{ marginTop: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🚐</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{vehicleName || vehicleType}</div>
                {vehicleName && vehicleType && (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{vehicleType}</div>
                )}
              </div>
            </div>
          )}

          {specialRequests && (
            <div style={{ marginTop: '12px', backgroundColor: '#fffbeb', borderRadius: '8px', padding: '12px', borderLeft: '3px solid #f59e0b' }}>
              <div style={labelStyle}>Special Requests</div>
              <div style={{ ...valueStyle, fontSize: '13px' }}>{specialRequests}</div>
            </div>
          )}
        </div>
      )}
      {/* ── DRIVER CONTACT ── */}
      {showDriverContact && (driverName || driverPhone) && (
        <div style={sectionStyle}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: primaryColor }}>👤</span> Your Driver
          </div>

          <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', flexShrink: 0,
            }}>
              👨‍✈️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{driverName || '—'}</div>
              {driverRating && (
                <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '2px' }}>
                  {'★'?.repeat(Math.floor(driverRating))} <span style={{ color: '#64748b' }}>{driverRating} rating</span>
                </div>
              )}
              {driverPhone && (
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                  📞 <a href={`tel:${driverPhone}`} style={{ color: primaryColor, textDecoration: 'none', fontWeight: '600' }}>{driverPhone}</a>
                </div>
              )}
              {driverLicensePlate && (
                <div style={{ marginTop: '6px' }}>
                  <span style={{
                    display: 'inline-block',
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    letterSpacing: '0.1em',
                    fontFamily: 'monospace',
                  }}>
                    {driverLicensePlate}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── PAYMENT INFO ── */}
      {showPaymentInfo && (totalAmount || paymentMethod) && (
        <div style={sectionStyle}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: primaryColor }}>💳</span> Payment
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', padding: '16px' }}>
            <div>
              {paymentMethod && (
                <>
                  <div style={labelStyle}>Payment Method</div>
                  <div style={valueStyle}>{paymentMethod}</div>
                </>
              )}
              {paymentStatus && (
                <div style={{ marginTop: '6px' }}>
                  <span style={{
                    display: 'inline-block',
                    backgroundColor: paymentStatus === 'Paid' ? '#dcfce7' : '#fef9c3',
                    color: paymentStatus === 'Paid' ? '#15803d' : '#854d0e',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '20px',
                  }}>
                    {paymentStatus}
                  </span>
                </div>
              )}
            </div>
            {totalAmount && (
              <div style={{ textAlign: 'right' }}>
                <div style={labelStyle}>Total Amount</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: accentColor }}>
                  ₱{Number(totalAmount)?.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── PICKUP INSTRUCTIONS ── */}
      {showPickupInstructions && pickupInstructions?.length > 0 && (
        <div style={{ ...sectionStyle, backgroundColor: '#f8fafc' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: primaryColor }}>📋</span> Pickup Instructions
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pickupInstructions?.map((instruction, index) => (
              instruction && (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                    color: '#ffffff', fontSize: '12px', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: '1px',
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', paddingTop: '3px' }}>
                    {instruction}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}
      {/* ── SUPPORT CONTACT ── */}
      {showSupportContact && (
        <div style={sectionStyle}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: primaryColor }}>🆘</span> Need Help?
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
            {supportPhone && (
              <div style={{ backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>📞</div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Call Us</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: primaryColor }}>{supportPhone}</div>
              </div>
            )}
            {supportEmail && (
              <div style={{ backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>✉️</div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Us</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: primaryColor }}>{supportEmail}</div>
              </div>
            )}
            {supportWebsite && (
              <div style={{ backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>🌐</div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visit Us</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: primaryColor }}>{supportWebsite}</div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── FOOTER ── */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '24px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
          {companyName}
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
          {companyTagline}
        </div>
        <div style={{ width: '40px', height: '2px', background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`, margin: '0 auto 12px' }} />
        <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>
          {footerNote}
        </div>
        <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>
          © {new Date()?.getFullYear()} {companyName}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
