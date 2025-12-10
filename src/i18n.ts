

// Load localized strings
const bundle = JSON.parse(
    JSON.stringify(await import('./lang/nls.json'))
);

try {
    const locale = process.env.LANG;
    if (locale && locale !== 'en') {
        const localizedBundle = await import(`./lang/nls.${locale}.json`);
        Object.assign(bundle, localizedBundle);
    }
} catch { }

export function localize(key: string, ...args: (string | number)[]): string {
    let message = bundle[key] || key;
    args.forEach((arg, index) => {
        message = message.replace(`{${index}}`, String(arg));
    });
    return message;
}



export default {
    get confirmationRequired() { return localize('notification.confirmationRequired'); },
};