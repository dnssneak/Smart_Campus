const bookings = [
  { start_datetime: '2026-05-12T08:00:00+00:00', status: 'confirmed' },
  { start_datetime: '2026-05-17T14:00:00+00:00', status: 'confirmed' },
  { start_datetime: '2026-05-17T16:00:00+00:00', status: 'confirmed' },
  { start_datetime: '2026-05-23T15:00:00+00:00', status: 'confirmed' }
];

const days = [];
const data = [];
const today = new Date('2026-05-15T12:00:00Z');
today.setHours(0, 0, 0, 0);

for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

    const nextDay = new Date(d);
    nextDay.setDate(d.getDate() + 1);

    const count = bookings.filter(b => {
        if (!b.start_datetime) return false;
        const bDate = new Date(b.start_datetime);
        return bDate >= d && bDate < nextDay && b.status !== 'cancelled' && b.status !== 'rejected';
    }).length;

    data.push(count);
}
console.log(days);
console.log(data);
