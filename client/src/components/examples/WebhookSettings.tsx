import { WebhookSettings } from "../WebhookSettings";

export default function WebhookSettingsExample() {
  const handleSave = (url: string) => {
    console.log("Saving webhook URL:", url);
  };

  return (
    <div className="max-w-2xl">
      <WebhookSettings
        connectionId="user-123"
        currentWebhookUrl="https://api.example.com/webhook"
        onSave={handleSave}
        isActive={true}
      />
    </div>
  );
}
