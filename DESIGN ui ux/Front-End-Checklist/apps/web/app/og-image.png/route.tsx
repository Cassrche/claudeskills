import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

const size = {
  width: 1200,
  height: 630
}

const rules = ['HTML', 'CSS', 'JavaScript', 'Performance', 'Accessibility', 'SEO', 'Security']
const fontFamily = 'Poppins'
const regularFont = readFile(join(process.cwd(), 'public/fonts/poppins-regular.ttf'))
const boldFont = readFile(join(process.cwd(), 'public/fonts/poppins-bold.ttf'))

/**
 * Render the default social preview image used by Open Graph and X cards.
 */
export async function GET() {
  const [regularFontData, boldFontData] = await Promise.all([regularFont, boldFont])

  return new ImageResponse(
    <div
      style={{
        alignItems: 'stretch',
        background: '#f8fafc',
        color: '#111827',
        display: 'flex',
        fontFamily,
        height: '100%',
        justifyContent: 'space-between',
        overflow: 'hidden',
        padding: 56,
        position: 'relative',
        width: '100%'
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(34, 197, 94, 0.10))',
          bottom: 0,
          display: 'flex',
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0
        }}
      />
      <div
        style={{
          backgroundImage:
            'linear-gradient(rgba(17, 24, 39, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(17, 24, 39, 0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          bottom: 0,
          display: 'flex',
          left: 0,
          opacity: 0.65,
          position: 'absolute',
          right: 0,
          top: 0
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          maxWidth: 690,
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              color: '#0f172a',
              display: 'flex',
              fontFamily,
              fontSize: 36,
              fontWeight: 750,
              letterSpacing: 0
            }}
          >
            Front-End Checklist
          </div>
          <div style={{ color: '#475569', display: 'flex', fontSize: 24 }}>
            frontendchecklist.io
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h1
            style={{
              color: '#0f172a',
              fontFamily,
              fontSize: 73,
              fontWeight: 780,
              letterSpacing: 0,
              lineHeight: 0.95,
              margin: 0
            }}
          >
            Ship frontend work with fewer misses
          </h1>
          <p
            style={{
              color: '#334155',
              fontFamily,
              fontSize: 31,
              lineHeight: 1.3,
              margin: 0,
              maxWidth: 650
            }}
          >
            385 actionable rules for accessibility, performance, SEO, security, images, testing,
            privacy, and internationalization.
          </p>
        </div>

        <div
          style={{
            color: '#2563eb',
            display: 'flex',
            fontFamily,
            fontSize: 28,
            fontWeight: 720
          }}
        >
          Build, review, and launch with confidence.
        </div>
      </div>

      <div
        style={{
          alignItems: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          justifyContent: 'center',
          position: 'relative',
          width: 355
        }}
      >
        {rules.map((rule, index) => (
          <div
            key={rule}
            style={{
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.12)',
              borderRadius: 16,
              boxShadow: '0 14px 34px rgba(15, 23, 42, 0.10)',
              display: 'flex',
              gap: 16,
              padding: '12px 18px',
              transform: `translateX(${index % 2 === 0 ? 0 : 18}px)`
            }}
          >
            <div
              style={{
                alignItems: 'center',
                background: index % 3 === 0 ? '#dbeafe' : index % 3 === 1 ? '#dcfce7' : '#fef3c7',
                borderRadius: 10,
                color: index % 3 === 0 ? '#1d4ed8' : index % 3 === 1 ? '#15803d' : '#b45309',
                display: 'flex',
                fontSize: 20,
                fontWeight: 800,
                height: 34,
                justifyContent: 'center',
                width: 34
              }}
            >
              {index + 1}
            </div>
            <div style={{ color: '#1e293b', display: 'flex', fontSize: 25, fontWeight: 700 }}>
              {rule}
            </div>
          </div>
        ))}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: fontFamily,
          data: regularFontData,
          style: 'normal',
          weight: 400
        },
        {
          name: fontFamily,
          data: boldFontData,
          style: 'normal',
          weight: 700
        }
      ]
    }
  )
}
