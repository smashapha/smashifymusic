const popularDomains: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'hotmal.com': 'hotmail.com'
};

const disposableDomains = [
  '10minutemail.com', 'mailinator.com', 'tempmail.com', 'sharklasers.com', 
  'guerrillamail.com', 'yopmail.com', 'throwawaymail.com', 'tempmail.ninja',
  'mailned.com', 'temp-mail.org'
];

export async function validateEmailStrict(email: string): Promise<{ valid: boolean; message?: string }> {
  if (!email || !email.includes('@')) {
    return { valid: false, message: 'Please enter a valid email format.' };
  }
  
  const domain = email.split('@')[1]?.toLowerCase();
  
  // Layer 1: Typo Check
  if (popularDomains[domain]) {
    return { valid: false, message: `Did you mean ${popularDomains[domain]}?` };
  }

  // Layer 2: Disposable Check
  if (disposableDomains.includes(domain)) {
    return { valid: false, message: 'Temporary/Disposable emails are not allowed on Smashify. Please use a permanent email account.' };
  }

  // Layer 3: MX Record Check via Backend (only in local or Express-supported environments)
  const isLocalEnv = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.endsWith('.run.app');

  if (isLocalEnv) {
    try {
      const res = await fetch('/api/check-email-mx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.valid) {
          return { valid: false, message: 'This email domain does not appear to exist. Please verify your spelling.' };
        }
      }
    } catch (err) {
      console.warn('MX check failed, skipping', err);
    }
  }

  return { valid: true };
}
