class AppConfig {
  static const baseUrl = String.fromEnvironment(
    'BASE_URL',
    defaultValue: 'http://localhost:3001',
  );

  static const wsTelemetryUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://localhost:4000/telemetry',
  );
}
