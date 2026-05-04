import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Phone, MessageCircle, Mail, MapPin } from 'lucide-react';
import ContactForm from './ContactForm';

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const items = [
    { Icon: Phone, label: t('contact.phone'), value: '+249 12 345 6789' },
    { Icon: MessageCircle, label: t('contact.wa'), value: '+249 12 345 6789' },
    { Icon: Mail, label: t('contact.email'), value: 'info@wadalmardi.com' },
    { Icon: MapPin, label: t('contact.location'), value: t('contact.location_value') },
  ];

  return (
    <div className="container py-12">
      <div className="text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-extrabold">{t('contact.title')}</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto">{t('contact.subtitle')}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div className="card p-6">
          <h3 className="font-extrabold mb-4">{t('contact.info_title')}</h3>
          <ul className="space-y-4">
            {items.map(({ Icon, label, value }) => (
              <li key={label} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-cream-100 text-brand-orange">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="font-semibold text-sm">{value}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h3 className="font-extrabold mb-4">أرسل لنا رسالة</h3>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
