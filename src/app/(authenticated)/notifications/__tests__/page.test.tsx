import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import NotificationsPage from '../page';
import {
  DELETE_ALL_NOTIFICATIONS,
  GET_NOTIFICATIONS,
  MARK_ALL_NOTIFICATIONS_READ,
  REMOVE_NOTIFICATION,
  SEEN_NOTIFICATION,
} from '@/graphql/notifications';
import { groupNotificationsByDay, notificationDayLabel } from '@/interfaces/notification';

const push = jest.fn();
const toast = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

jest.mock('@/components/hooks/userHooks', () => ({
  useCurrentUser: () => 'pilot@example.com',
  useUserData: () => ({ id: '7' }),
}));

const today = new Date();
const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

const notification = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  notification_type: 'RESERVATION_CONFIRMED',
  message: `Message ${id}`,
  notification_date: today.toISOString(),
  is_read: false,
  action_url: null,
  priority: 'low',
  ...overrides,
});

const listMock = (items: unknown[]): MockedResponse => ({
  request: { query: GET_NOTIFICATIONS, variables: { userId: 7 } },
  result: { data: { notificationsByUser: items } },
});

const initial = [
  notification(1),
  notification(2, { is_read: true, notification_type: 'PAYMENT_RECEIVED', notification_date: lastWeek.toISOString() }),
  notification(3, { priority: 'high', notification_type: 'LICENSE_EXPIRED', message: 'Votre licence a expiré' }),
];

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <NotificationsPage />
    </MockedProvider>,
  );

describe('notificationDayLabel', () => {
  const now = new Date(2026, 9, 12, 15, 0);

  it('nomme aujourd’hui et hier, puis donne la date complète', () => {
    expect(notificationDayLabel(new Date(2026, 9, 12, 8, 0), now)).toBe("Aujourd'hui");
    expect(notificationDayLabel(new Date(2026, 9, 11, 23, 0), now)).toBe('Hier');
    expect(notificationDayLabel(new Date(2026, 9, 5, 10, 0), now)).toBe('Lundi 5 octobre 2026');
  });

  it('regroupe les notifications consécutives du même jour', () => {
    const groups = groupNotificationsByDay(
      [
        { notification_date: new Date(2026, 9, 12, 9).toISOString() },
        { notification_date: new Date(2026, 9, 12, 8).toISOString() },
        { notification_date: new Date(2026, 9, 11, 8).toISOString() },
      ],
      now,
    );

    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["Aujourd'hui", 2],
      ['Hier', 1],
    ]);
  });
});

describe('NotificationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('affiche un seul titre et les notifications regroupées par jour', async () => {
    renderPage([listMock(initial)]);

    expect(await screen.findByText('Message 1')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByText('Centre de notifications')).not.toBeInTheDocument();
    expect(screen.getByText('2 non lues sur 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: "Aujourd'hui" })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
  });

  it('filtre par recherche', async () => {
    renderPage([listMock(initial)]);
    await screen.findByText('Message 1');

    fireEvent.change(screen.getByRole('searchbox', { name: /Rechercher/i }), { target: { value: 'licence' } });

    expect(screen.getByText('Votre licence a expiré')).toBeInTheDocument();
    expect(screen.queryByText('Message 1')).not.toBeInTheDocument();
  });

  it('marque une notification comme lue en un clic', async () => {
    renderPage([
      listMock(initial),
      { request: { query: SEEN_NOTIFICATION, variables: { id: 1 } }, result: { data: { seenNotification: true } } },
      listMock([{ ...initial[0], is_read: true }, initial[1], initial[2]]),
    ]);
    await screen.findByText('Message 1');

    fireEvent.click(screen.getByRole('button', { name: 'Marquer comme lue : Réservation confirmée' }));

    expect(await screen.findByText('1 non lue sur 3')).toBeInTheDocument();
  });

  it('demande confirmation avant de tout supprimer, puis supprime tout en une seule requête', async () => {
    const removedOne = jest.fn(() => ({ data: { removeNotification: true } }));
    const removedAll = jest.fn(() => ({ data: { deleteAllNotifications: 3 } }));
    renderPage([
      listMock(initial),
      ...[3, 1, 2].map((id) => ({
        request: { query: REMOVE_NOTIFICATION, variables: { id } },
        result: removedOne,
      })),
      { request: { query: DELETE_ALL_NOTIFICATIONS }, result: removedAll },
      listMock([]),
    ]);
    await screen.findByText('Message 1');

    fireEvent.click(screen.getByRole('button', { name: /Tout supprimer/i }));
    expect(removedAll).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Supprimer 3 notifications ?')).toBeInTheDocument();
    expect(within(dialog).getByText(/Toutes vos notifications seront supprimées/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }));

    expect(await screen.findByText('Aucune notification')).toBeInTheDocument();
    expect(removedAll).toHaveBeenCalledTimes(1);
    // Plus une requête par notification.
    expect(removedOne).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({ title: '3 notifications supprimées' });
  });

  it('marque tout comme lu en une seule requête', async () => {
    const seenOne = jest.fn(() => ({ data: { seenNotification: true } }));
    const seenAll = jest.fn(() => ({ data: { markAllNotificationsRead: 2 } }));
    renderPage([
      listMock(initial),
      ...[1, 3].map((id) => ({ request: { query: SEEN_NOTIFICATION, variables: { id } }, result: seenOne })),
      { request: { query: MARK_ALL_NOTIFICATIONS_READ }, result: seenAll },
      listMock(initial.map((item) => ({ ...item, is_read: true }))),
    ]);
    await screen.findByText('Message 1');

    fireEvent.click(screen.getByRole('button', { name: /Tout marquer comme lu/i }));

    expect(await screen.findByText('Tout est lu.')).toBeInTheDocument();
    expect(seenAll).toHaveBeenCalledTimes(1);
    expect(seenOne).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({ title: '2 notifications marquées comme lues' });
  });

  it('ne supprime que la liste filtrée quand une recherche est active', async () => {
    const removedOne = jest.fn(() => ({ data: { removeNotification: true } }));
    const removedAll = jest.fn(() => ({ data: { deleteAllNotifications: 3 } }));
    renderPage([
      listMock(initial),
      { request: { query: REMOVE_NOTIFICATION, variables: { id: 3 } }, result: removedOne },
      { request: { query: DELETE_ALL_NOTIFICATIONS }, result: removedAll },
      listMock([initial[0], initial[1]]),
    ]);
    await screen.findByText('Message 1');

    fireEvent.change(screen.getByRole('searchbox', { name: /Rechercher/i }), { target: { value: 'licence' } });
    fireEvent.click(screen.getByRole('button', { name: /Tout supprimer/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Supprimer 1 notification ?')).toBeInTheDocument();
    expect(within(dialog).getByText(/Seules les notifications de la liste filtrée/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(removedOne).toHaveBeenCalledTimes(1));
    expect(removedAll).not.toHaveBeenCalled();
  });

  it('signale un échec de la suppression groupée sans rien retirer de la liste', async () => {
    // The page logs the failure it reports.
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    renderPage([
      listMock(initial),
      { request: { query: DELETE_ALL_NOTIFICATIONS }, error: new Error('Erreur réseau') },
      listMock(initial),
    ]);
    await screen.findByText('Message 1');

    fireEvent.click(screen.getByRole('button', { name: /Tout supprimer/i }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Suppression interrompue',
        description: "Toutes les notifications n'ont pas pu être supprimées.",
      }),
    );
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    logged.mockRestore();
  });
});
