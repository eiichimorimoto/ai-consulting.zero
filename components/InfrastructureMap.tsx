'use client'

import { useEffect, useState } from 'react'
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api'

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
  companyName?: string
}

// 都道府県と市区町村から緯度経度を取得（主要都市のマッピング）
const getCityCoordinates = (prefecture: string, city: string) => {
  const coordinates: { [key: string]: { lat: number; lng: number } } = {
    '愛知県名古屋市': { lat: 35.1815, lng: 136.9066 },
    '東京都千代田区': { lat: 35.6938, lng: 139.7536 },
    '東京都': { lat: 35.6762, lng: 139.6503 },
    '大阪府大阪市': { lat: 34.6937, lng: 135.5023 },
    '大阪府': { lat: 34.6937, lng: 135.5023 },
    '神奈川県横浜市': { lat: 35.4437, lng: 139.6380 },
    '福岡県福岡市': { lat: 33.5904, lng: 130.4017 },
    '北海道札幌市': { lat: 43.0642, lng: 141.3469 },
    '宮城県仙台市': { lat: 38.2682, lng: 140.8694 },
  }

  const key = `${prefecture}${city}`.replace(/[市区町村]/g, '')
  return coordinates[key] || coordinates[prefecture] || { lat: 35.6762, lng: 139.6503 } // デフォルトは東京
}

export default function InfrastructureMap({ infrastructure, prefecture, city, companyName }: InfrastructureMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const center = getCityCoordinates(prefecture, city)

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

      <LoadScript 
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
        onLoad={() => setMapLoaded(true)}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={14}
          options={mapOptions}
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
      </LoadScript>

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

      {!mapLoaded && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: 'var(--text-secondary)',
          fontSize: '10px'
        }}>
          地図を読み込み中...
        </div>
      )}
    </div>
  )
}
