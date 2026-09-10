import { MyHealthForecast } from "@/components/pi/health-forecast";

export const metadata = {
  title: "My Health Forecast · Nexura Patient Portal",
  description: "See where your health is heading — and how small daily choices bend the curve. Supportive, never alarming.",
};

export default function MyFuturePage() {
  return <MyHealthForecast />;
}
