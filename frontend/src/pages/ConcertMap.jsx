import React from 'react';
import { NaverMap, Marker, RenderAfterNavermapsLoaded } from 'react-naver-maps';

const ConcertMap = ({ concerts }) => {
  const defaultCenter = { lat: 37.5665, lng: 126.9780 }; // 서울 기준

  return (
    <RenderAfterNavermapsLoaded
      ncpClientId={process.env.REACT_APP_NAVER_MAPS_CLIENT_ID} // .env에 발급받은 ClientID
      error={<p>지도 로딩 실패</p>}
      loading={<p>지도 로딩 중...</p>}
    >
      <NaverMap
        mapDivId={'concert-map'}
        style={{ width: '100%', height: '400px' }}
        defaultCenter={defaultCenter}
        defaultZoom={12}
      >
        {concerts.map((concert) => (
          <Marker
            key={concert.id}
            position={{
              lat: concert.latitude,
              lng: concert.longitude,
            }}
            title={concert.title}
          />
        ))}
      </NaverMap>
    </RenderAfterNavermapsLoaded>
  );
};

export default ConcertMap;
