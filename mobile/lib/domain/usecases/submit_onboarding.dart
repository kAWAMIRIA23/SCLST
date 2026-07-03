import '../../data/models/driver_model.dart';
import '../../data/repositories/auth_repository.dart';
import '../../domain/entities/driver.dart';

class SubmitOnboarding {
  SubmitOnboarding(this._repository);

  final AuthRepository _repository;

  Future<DriverModel> call({
    required String phone,
    required String licensePlate,
    required VehicleTier tier,
  }) {
    return _repository.submitOnboarding(
      phone: phone,
      licensePlate: licensePlate,
      tier: tier,
    );
  }
}
