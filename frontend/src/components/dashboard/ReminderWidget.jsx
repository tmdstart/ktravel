// ktravel/frontend/src/components/dashboard/ReminderWidget.jsx
import React from 'react';
import { Calendar } from 'lucide-react';

const ReminderWidget = ({ reminders }) => {
  return (
    <div className="reminder-widget">
      <h3 className="widget-header">
        <Calendar size={18} color="#3853FF" />
        취향 리마인드
      </h3>
      {reminders.map((reminder) => (
        <div key={reminder.id} className="reminder-card">
          <div className="reminder-icon">{reminder.icon}</div>
          <div className="reminder-message">{reminder.message}</div>
        </div>
      ))}
    </div>
  );
};

export default ReminderWidget;
