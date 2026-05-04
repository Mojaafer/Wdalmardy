'use client';

import { FormEvent, useState } from 'react';
import { submitContactMessage } from '@/lib/api';
import { CheckCircle2, Send } from 'lucide-react';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await submitContactMessage({
        name,
        phone: phone || undefined,
        email: email || undefined,
        subject: subject || undefined,
        body,
        order_number: orderNumber || undefined,
      });
      setDone(true);
    } catch {
      setError('فشل إرسال الرسالة. حاول مرة أخرى أو اتصل بنا مباشرة.');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-8 space-y-3">
        <CheckCircle2 className="h-12 w-12 text-brand-orange mx-auto" />
        <p className="font-bold">شكراً، تم استلام رسالتك بنجاح</p>
        <p className="text-xs text-gray-500">سنرد عليك خلال 24 ساعة على رقم الواتساب أو البريد الإلكتروني.</p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setName('');
            setPhone('');
            setEmail('');
            setSubject('');
            setBody('');
            setOrderNumber('');
          }}
          className="text-xs text-brand-orange underline"
        >
          إرسال رسالة أخرى
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="الاسم *">
        <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="الهاتف">
          <input dir="ltr" className="input" value={phone} placeholder="+249..." onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="البريد">
          <input type="email" dir="ltr" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <Field label="الموضوع">
        <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="رقم الطلب (اختياري)">
        <input className="input" dir="ltr" value={orderNumber} placeholder="WD-260428-001" onChange={(e) => setOrderNumber(e.target.value)} />
      </Field>
      <Field label="الرسالة *">
        <textarea required rows={4} className="input" value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>

      {error && <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded">{error}</div>}

      <button type="submit" disabled={sending} className="btn-primary w-full disabled:opacity-50">
        <Send className="h-4 w-4" />
        {sending ? 'جارٍ الإرسال…' : 'إرسال الرسالة'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-bold mb-1">{label}</div>
      {children}
    </label>
  );
}
