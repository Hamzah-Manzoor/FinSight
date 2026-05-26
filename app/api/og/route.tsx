import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') ?? 'FinSight — Investment Calculators'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
          padding: '80px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '48px',
            left: '64px',
            display: 'flex',
            color: '#d1fae5',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.5px',
          }}
        >
          FinSight
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              color: '#ffffff',
              fontSize: title.length > 40 ? '48px' : '60px',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-1px',
              maxWidth: '900px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: '#a7f3d0',
              fontSize: '28px',
              fontWeight: 400,
            }}
          >
            Free investment calculators. No signup, no ads.
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
