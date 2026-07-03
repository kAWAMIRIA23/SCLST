import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../errors/exceptions.dart';

enum WebSocketStatus { connecting, connected, disconnected, error }

class WebSocketClient {
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  Timer? _reconnectTimer;

  final _messagesController = StreamController<Map<String, dynamic>>.broadcast();
  final _statusController = StreamController<WebSocketStatus>.broadcast();

  String? _url;
  int _reconnectAttempts = 0;
  bool _manualDisconnect = false;

  static const _maxReconnectAttempts = 5;
  static const _baseDelaySeconds = 3;

  Stream<Map<String, dynamic>> get messages => _messagesController.stream;
  Stream<WebSocketStatus> get statusStream => _statusController.stream;

  Future<void> connect(String url) async {
    _url = url;
    _manualDisconnect = false;
    _reconnectAttempts = 0;
    await _openConnection();
  }

  Future<void> _openConnection() async {
    if (_url == null) return;

    _statusController.add(WebSocketStatus.connecting);

    try {
      _channel = WebSocketChannel.connect(Uri.parse(_url!));
      await _channel!.ready;

      _statusController.add(WebSocketStatus.connected);
      _reconnectAttempts = 0;

      _subscription = _channel!.stream.listen(
        (event) {
          try {
            final decoded = jsonDecode(event as String) as Map<String, dynamic>;
            _messagesController.add(decoded);
          } catch (_) {
            // ignore malformed messages
          }
        },
        onError: (_) {
          _statusController.add(WebSocketStatus.error);
          _scheduleReconnect();
        },
        onDone: () {
          _statusController.add(WebSocketStatus.disconnected);
          if (!_manualDisconnect) {
            _scheduleReconnect();
          }
        },
        cancelOnError: true,
      );
    } catch (_) {
      _statusController.add(WebSocketStatus.error);
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_manualDisconnect || _url == null) return;
    if (_reconnectAttempts >= _maxReconnectAttempts) return;

    _reconnectTimer?.cancel();
    final delaySeconds = _baseDelaySeconds * (1 << _reconnectAttempts);
    _reconnectAttempts++;

    _reconnectTimer = Timer(Duration(seconds: delaySeconds), () async {
      await _subscription?.cancel();
      _subscription = null;
      _channel = null;
      await _openConnection();
    });
  }

  void send(Map<String, dynamic> payload) {
    if (_channel == null) {
      throw const WebSocketException('WebSocket is not connected');
    }
    _channel!.sink.add(jsonEncode(payload));
  }

  Future<void> disconnect() async {
    _manualDisconnect = true;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    await _subscription?.cancel();
    _subscription = null;
    await _channel?.sink.close();
    _channel = null;
    _statusController.add(WebSocketStatus.disconnected);
  }

  void dispose() {
    disconnect();
    _messagesController.close();
    _statusController.close();
  }
}
