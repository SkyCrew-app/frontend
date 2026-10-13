import { freeRanges } from '../free-ranges';

const at = (time: string) => new Date(`2026-10-20T${time}:00`);
const booking = (start: string, end: string) => ({ start_time: `2026-10-20T${start}:00`, end_time: `2026-10-20T${end}:00` });
const hours = (ranges: { start: Date; end: Date }[]) =>
  ranges.map(({ start, end }) => `${start.toTimeString().slice(0, 5)}-${end.toTimeString().slice(0, 5)}`);

const OPENING = at('08:00');
const CLOSING = at('20:00');

describe('freeRanges', () => {
  it('rend toute la journée quand il n’y a aucune réservation', () => {
    expect(hours(freeRanges(OPENING, CLOSING, []))).toEqual(['08:00-20:00']);
  });

  it('retire les réservations des heures d’ouverture', () => {
    expect(hours(freeRanges(OPENING, CLOSING, [booking('10:00', '12:00'), booking('14:00', '15:30')]))).toEqual([
      '08:00-10:00',
      '12:00-14:00',
      '15:30-20:00',
    ]);
  });

  it('ne dépend pas de l’ordre des réservations', () => {
    expect(hours(freeRanges(OPENING, CLOSING, [booking('14:00', '15:00'), booking('09:00', '10:00')]))).toEqual([
      '08:00-09:00',
      '10:00-14:00',
      '15:00-20:00',
    ]);
  });

  it('fusionne les réservations qui se touchent ou se chevauchent', () => {
    expect(
      hours(freeRanges(OPENING, CLOSING, [booking('09:00', '11:00'), booking('11:00', '12:00'), booking('11:30', '13:00')])),
    ).toEqual(['08:00-09:00', '13:00-20:00']);
  });

  it('ignore une réservation contenue dans une autre', () => {
    expect(hours(freeRanges(OPENING, CLOSING, [booking('09:00', '15:00'), booking('10:00', '11:00')]))).toEqual([
      '08:00-09:00',
      '15:00-20:00',
    ]);
  });

  it('gère les réservations au bord ou au-delà des heures d’ouverture', () => {
    expect(hours(freeRanges(OPENING, CLOSING, [booking('07:00', '09:00'), booking('19:00', '21:00')]))).toEqual([
      '09:00-19:00',
    ]);
    expect(hours(freeRanges(OPENING, CLOSING, [booking('06:00', '07:00'), booking('20:00', '22:00')]))).toEqual([
      '08:00-20:00',
    ]);
  });

  it('ne rend rien quand l’avion est pris toute la journée', () => {
    expect(freeRanges(OPENING, CLOSING, [booking('08:00', '20:00')])).toEqual([]);
    expect(freeRanges(OPENING, CLOSING, [booking('07:00', '14:00'), booking('13:00', '23:00')])).toEqual([]);
  });

  it('écarte les trous trop courts pour un vol', () => {
    const bookings = [booking('09:00', '10:00'), booking('10:20', '12:00')];

    expect(hours(freeRanges(OPENING, CLOSING, bookings))).toEqual(['08:00-09:00', '12:00-20:00']);
    expect(hours(freeRanges(OPENING, CLOSING, bookings, { minMinutes: 15 }))).toEqual([
      '08:00-09:00',
      '10:00-10:20',
      '12:00-20:00',
    ]);
  });

  it('ne propose rien avant l’heure qu’il est, arrondie au quart d’heure suivant', () => {
    const bookings = [booking('09:00', '11:00'), booking('14:00', '15:00')];

    expect(hours(freeRanges(OPENING, CLOSING, bookings, { notBefore: at('10:00') }))).toEqual([
      '11:00-14:00',
      '15:00-20:00',
    ]);
    expect(hours(freeRanges(OPENING, CLOSING, bookings, { notBefore: at('12:07') }))).toEqual([
      '12:15-14:00',
      '15:00-20:00',
    ]);
    expect(hours(freeRanges(OPENING, CLOSING, bookings, { notBefore: at('07:00') }))).toEqual([
      '08:00-09:00',
      '11:00-14:00',
      '15:00-20:00',
    ]);
  });

  it('ne propose rien pour une journée passée ou presque finie', () => {
    expect(freeRanges(OPENING, CLOSING, [], { notBefore: at('20:00') })).toEqual([]);
    expect(freeRanges(OPENING, CLOSING, [], { notBefore: at('19:40') })).toEqual([]);
    expect(freeRanges(OPENING, CLOSING, [], { notBefore: new Date('2026-10-21T09:00:00') })).toEqual([]);
  });

  it('ne rend rien pour des heures d’ouverture invalides', () => {
    expect(freeRanges(CLOSING, OPENING, [])).toEqual([]);
    expect(freeRanges(OPENING, OPENING, [])).toEqual([]);
    expect(freeRanges(new Date('invalid'), CLOSING, [])).toEqual([]);
  });

  it('ignore une réservation dont les dates sont illisibles', () => {
    expect(hours(freeRanges(OPENING, CLOSING, [{ start_time: 'x', end_time: 'y' }]))).toEqual(['08:00-20:00']);
  });

  it('accepte des dates déjà construites', () => {
    expect(hours(freeRanges(OPENING, CLOSING, [{ start_time: at('10:00'), end_time: at('11:00') }]))).toEqual([
      '08:00-10:00',
      '11:00-20:00',
    ]);
  });
});
