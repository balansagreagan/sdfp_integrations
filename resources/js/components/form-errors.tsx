export function FormErrors({ errors }: { errors: Record<string, string> }) {
    const messages = Object.values(errors);
    if (!messages.length) return null;
    return (
        <ul role="alert" className="space-y-1 rounded-md bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
            {messages.map((message) => (
                <li key={message}>{message}</li>
            ))}
        </ul>
    );
}
