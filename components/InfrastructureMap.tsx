'use client'

import { useEffect, useState } from 'react'
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api'

interface InfrastructureItem {
  title: string
  status: string
  description?: string
  url?: string
}

interface InfrastructureMapProps {
  infrastructure: InfrastructureItem[]
  prefecture: string
  city: string
  address?: string
  postalCode?: string
  companyName?: string
}

export default function InfrastructureMap({ infrastructure, prefecture, city, address, postalCode, companyName }: InfrastructureMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null)
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 35.6762, lng: 139.6503 }) // デフォルトは東京
  const [isLoadingLocation, setIsLoadingLocation] = useState(true)

  // Google Maps APIを読み込み（重複読み込みを防止）
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  })

  // Google Geocoding APIで住所から座標を取得
  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        // 完全な住所を組み立て（郵便番号+都道府県+市区町村+詳細住所）
        // 例: 〒460-0008 愛知県名古屋市中区栄3-18-1
        const fullAddress = postalCode 
          ? `〒${postalCode} ${prefecture}${city}${address || ''}`.trim()
          : `${prefecture}${city}${address || ''}`.trim()
        
        console.log('🗺️ Geocoding API 住所検索:', fullAddress)
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        
        if (!apiKey) {
          console.error('Google Maps APIキーが設定されていません')
          setIsLoadingLocation(false)
          return
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}&language=ja`
        )
        const data = await response.json()

        if (data.status === 'OK' && data.results[0]) {
          const location = data.results[0].geometry.location
          console.log('✅ 座標取得成功:', location, 'formatted_address:', data.results[0].formatted_address)
          setCenter({ lat: location.lat, lng: location.lng })
        } else {
          console.error('❌ 住所の座標取得に失敗:', data.status, 'address:', fullAddress)
        }
      } catch (error) {
        console.error('Geocoding APIエラー:', error)
      } finally {
        setIsLoadingLocation(false)
      }
    }

    fetchCoordinates()
  }, [prefecture, city, address, postalCode])

  // マーカーの色を取得
  const getMarkerIcon = (status: string) => {
    const colors = {
      error: '#ef4444',    // 赤
      warning: '#f59e0b',  // 黄
      ok: '#10b981'        // 緑
    }
    const color = colors[status as keyof typeof colors] || colors.ok

    return {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 1.5,
    }
  }

  // 会社マーカーアイコン（青い特別なピン）
  const companyIcon = {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor: '#0ea5e9',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 3,
    scale: 2,
  }

  // インフラマーカーの位置（会社の周辺にランダム配置）
  const getInfraPosition = (index: number) => {
    const offsets = [
      { lat: 0.005, lng: 0.005 },   // 北東
      { lat: 0.005, lng: -0.005 },  // 北西
      { lat: -0.005, lng: 0.005 },  // 南東
      { lat: -0.005, lng: -0.005 }, // 南西
      { lat: 0, lng: 0.007 },       // 東
    ]
    const offset = offsets[index % offsets.length]
    return {
      lat: center.lat + offset.lat,
      lng: center.lng + offset.lng,
    }
  }

  const mapContainerStyle = {
    width: '100%',
    height: '200px',
    borderRadius: '8px',
  }

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ],
  }

  return (
    <div style={{ marginBottom: '10px' }}>
      {/* エリア名表示 */}
      <div style={{ 
        fontSize: '11px', 
        fontWeight: '600', 
        color: '#0369a1',
        marginBottom: '8px',
        textAlign: 'center'
      }}>
        📍 {prefecture}{city}エリア
      </div>

      {loadError && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#ef4444',
          fontSize: '12px'
        }}>
          ❌ 地図の読み込みに失敗しました
        </div>
      )}

      {!isLoaded ? (
        <div style={{ 
          position: 'relative',
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          borderRadius: '8px',
          color: 'var(--text-secondary)',
          fontSize: '10px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '4px' }}>🗺️</div>
            地図を読み込み中...
          </div>
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={14}
          options={mapOptions}
          key={`${center.lat}-${center.lng}`}
          onLoad={(map) => {
            // 地図読み込み後に中心を確実に設定
            map.setCenter(center)
            console.log('🗺️ 地図の中心を設定:', center)
          }}
        >
          {/* 会社位置マーカー */}
          <Marker
            position={center}
            icon={companyIcon}
            title={`📍 ${companyName || '自社'}の位置`}
            onClick={() => setSelectedMarker(-1)}
          />

          {selectedMarker === -1 && (
            <InfoWindow
              position={center}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div style={{ padding: '4px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#0369a1' }}>
                  🏢 {companyName || '自社'}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                  {prefecture}{city}
                </div>
              </div>
            </InfoWindow>
          )}

          {/* インフラマーカー */}
          {infrastructure.slice(0, 5).map((item, index) => {
            const position = getInfraPosition(index)
            const circleNumbers = ['①', '②', '③', '④', '⑤']
            return (
              <Marker
                key={index}
                position={position}
                icon={getMarkerIcon(item.status)}
                label={{
                  text: circleNumbers[index],
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
                title={item.title}
                onClick={() => setSelectedMarker(index)}
              />
            )
          })}

          {/* インフラ情報ウィンドウ */}
          {selectedMarker !== null && selectedMarker >= 0 && infrastructure[selectedMarker] && (
            <InfoWindow
              position={getInfraPosition(selectedMarker)}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div style={{ padding: '4px', maxWidth: '200px' }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '11px', 
                  color: infrastructure[selectedMarker].status === 'error' ? '#ef4444' : 
                         infrastructure[selectedMarker].status === 'warning' ? '#f59e0b' : '#10b981',
                  marginBottom: '4px'
                }}>
                  {infrastructure[selectedMarker].status === 'error' ? '🚨' : 
                   infrastructure[selectedMarker].status === 'warning' ? '⚠️' : '✅'} 
                  {infrastructure[selectedMarker].title}
                </div>
                {infrastructure[selectedMarker].description && (
                  <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.4' }}>
                    {infrastructure[selectedMarker].description.slice(0, 80)}
                  </div>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      )}

      {/* 凡例 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '10px', 
        marginTop: '8px',
        fontSize: '9px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0ea5e9', border: '2px solid white' }}></span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>自社</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
          <span style={{ color: 'var(--text-secondary)' }}>要注意</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
          <span style={{ color: 'var(--text-secondary)' }}>注意</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
          <span style={{ color: 'var(--text-secondary)' }}>正常</span>
        </div>
      </div>

      {isLoadingLocation && isLoaded && (
        <div style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', 
          padding: '12px 20px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          color: 'var(--text-secondary)',
          fontSize: '10px',
          zIndex: 1000
        }}>
          <div style={{ marginBottom: '4px' }}>🗺️</div>
          住所を検索中...
        </div>
      )}
    </div>
  )
}
