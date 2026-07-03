import '../../core/constants/app_config.dart';
import '../../core/network/websocket_client.dart';
import '../../data/models/telemetry_model.dart';

class StreamTelemetry {
  StreamTelemetry(this._webSocketClient);

  final WebSocketClient _webSocketClient;

  Future<void> connect() => _webSocketClient.connect(AppConfig.wsTelemetryUrl);

  void sendTelemetry(TelemetryModel telemetry) {
    _webSocketClient.send(telemetry.toJson());
  }

  Future<void> disconnect() => _webSocketClient.disconnect();
}
