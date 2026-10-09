import { buildNotificationSettings } from '../notification-settings';

describe('buildNotificationSettings', () => {
  const current = {
    email_notifications_enabled: true,
    sms_notifications_enabled: false,
    newsletter_subscribed: true,
  };

  it('ne modifie que le réglage basculé et conserve les deux autres', () => {
    expect(buildNotificationSettings(current, { sms_notifications_enabled: true })).toEqual({
      email_notifications_enabled: true,
      sms_notifications_enabled: true,
      newsletter_subscribed: true,
    });
    expect(buildNotificationSettings(current, { email_notifications_enabled: false })).toEqual({
      email_notifications_enabled: false,
      sms_notifications_enabled: false,
      newsletter_subscribed: true,
    });
  });

  it("envoie toujours trois booléens, même si une valeur n'est pas renseignée", () => {
    expect(
      buildNotificationSettings(
        { email_notifications_enabled: null, sms_notifications_enabled: true },
        { email_notifications_enabled: true },
      ),
    ).toEqual({
      email_notifications_enabled: true,
      sms_notifications_enabled: true,
      newsletter_subscribed: false,
    });
  });

  it("ne reprend pas les autres champs de l'utilisateur", () => {
    const user = { ...current, id: 42, __typename: 'User' };

    expect(Object.keys(buildNotificationSettings(user, {})).sort()).toEqual([
      'email_notifications_enabled',
      'newsletter_subscribed',
      'sms_notifications_enabled',
    ]);
  });
});
