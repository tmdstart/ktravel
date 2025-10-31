// src/components/SubPathItem.jsx
import React, { useState } from 'react';
import { BusFront, Clock, PersonStanding, Train, Repeat2 } from 'lucide-react';

const SubPathItem = ({ path, index, subPathArray }) => {
    const [isPassStopsVisible, setIsPassStopsVisible] = useState(false);

    const iconMap = {
        1: <Train className="icon subway" />,
        2: <BusFront className="icon bus" />,
        3: <PersonStanding className="icon walk" />,
        'transfer': <Repeat2 className="icon transfer" />,
    };

    const trafficTypeKey = path?.trafficType;
    let icon = iconMap[trafficTypeKey];
    let description;
    let colorClass = "";
    let detailContent = null;
    let showToggleButton = false;
    let passStopCount = 0;

    const isPrevSubway = index > 0 && subPathArray[index - 1]?.trafficType === 1;
    const isNextSubway = index < subPathArray.length - 1 && subPathArray[index + 1]?.trafficType === 1;
    const timeText = path.sectionTime ? `${path.sectionTime} min` : "";

    if (trafficTypeKey === 1) {
        colorClass = "segment subway";
        const lineName = path.lane?.[0]?.name ?? '';
        const stationCount = path.stationCount ? `${path.stationCount} stops` : "";
        description = (
            <span className="desc subway">
                Subway ({lineName}) {path.startName} → {path.endName} ({timeText}{stationCount ? `, ${stationCount}` : ''})
            </span>
        );

        if (path.passStopList?.stations?.length > 2) {
            const passStops = path.passStopList.stations.slice(1, -1).map(stop => stop.stationName);
            passStopCount = passStops.length;
            showToggleButton = true;
            detailContent = (
                <div className="pass-stops">
                    Passing stops: {passStops.join(" → ")}
                </div>
            );
        }

    } else if (trafficTypeKey === 2) {
        colorClass = "segment bus";
        const busNo = path.lane?.[0]?.busNo ?? '';
        description = (
            <span className="desc bus">
                Bus ({busNo}) {path.startName} → {path.endName} ({timeText})
            </span>
        );

    } else if (trafficTypeKey === 3) {
        if (path.sectionTime <= 3 && isPrevSubway && isNextSubway) {
            icon = iconMap['transfer'];
            colorClass = "segment transfer";
            description = (
                <span className="desc transfer">
                    Transfer (Subway → Subway) within station ({timeText})
                </span>
            );

        } else {
            colorClass = "segment walk";
            const distanceKm = path.distance ? (path.distance / 1000).toFixed(2) : '0.00';
            description = (
                <span className="desc walk">
                    Walk {timeText} ({distanceKm} km)
                </span>
            );
        }
    } else {
        colorClass = "segment walk";
        description = <span className="desc walk">No info</span>;
    }

    return (
        <div className={`subpath-item ${colorClass}`}>
            <div className="subpath-header">
                <div className="subpath-icon">{icon}</div>
                <div className="subpath-info">
                    {description}
                    {showToggleButton && (
                        <button
                            className="toggle-stops-btn"
                            onClick={() => setIsPassStopsVisible(prev => !prev)}
                        >
                            {passStopCount} stops {isPassStopsVisible ? "Hide ▲" : "Show ▼"}
                        </button>
                    )}
                </div>
            </div>

            {isPassStopsVisible && detailContent}
        </div>
    );
};

export default SubPathItem;
