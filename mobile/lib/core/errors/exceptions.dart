class AuthException implements Exception {
  final String message;
  const AuthException(this.message);

  @override
  String toString() => 'AuthException: $message';
}

class NetworkException implements Exception {
  final String message;
  const NetworkException(this.message);

  @override
  String toString() => 'NetworkException: $message';
}

class WebSocketException implements Exception {
  final String message;
  const WebSocketException(this.message);

  @override
  String toString() => 'WebSocketException: $message';
}

class TelemetryException implements Exception {
  final String message;
  const TelemetryException(this.message);

  @override
  String toString() => 'TelemetryException: $message';
}

class PermissionException implements Exception {
  final String message;
  const PermissionException(this.message);

  @override
  String toString() => 'PermissionException: $message';
}
