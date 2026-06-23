const m = {
  useLocale: () => 'ar',
  useTranslations: () => (key: string) => key,
  useMessages: () => ({}),
  useTimeZone: () => 'Africa/Khartoum',
  useNow: () => new Date(),
};

module.exports = m;
module.exports.default = m;
