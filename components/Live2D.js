import { siteConfig } from '@/lib/config'
import { isMobile } from '@/lib/utils'
import Script from 'next/script'
import { useEffect, useState } from 'react'

/**
 * 博客鲸鱼娘
 * @returns
 */
export default function Live2D() {
  const showPet = JSON.parse(siteConfig('WIDGET_PET'))
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(showPet && !isMobile())
  }, [showPet])

  if (!visible) {
    return null
  }

  return (
    <>
      <Script src='/whale/whale-mascot.js' type='module' strategy='afterInteractive' />
      <div
        style={{
          position: 'fixed',
          left: '12px',
          bottom: '12px',
          zIndex: 40,
          pointerEvents: 'none'
        }}>
        <whale-mascot style={{ '--mascot-width': '180px' }} />
      </div>
    </>
  )
}
