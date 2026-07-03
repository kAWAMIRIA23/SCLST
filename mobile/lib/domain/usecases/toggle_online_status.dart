import '../../data/repositories/trip_repository.dart';
import '../../domain/entities/driver.dart';

class ToggleOnlineStatus {
  ToggleOnlineStatus(this._repository);

  final TripRepository _repository;

  Future<DriverStatus> call(bool isOnline) =>
      _repository.toggleOnlineStatus(isOnline);
}
