part of 'auth_bloc.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class OnboardingSubmitted extends AuthEvent {
  const OnboardingSubmitted({
    required this.phone,
    required this.licensePlate,
    required this.tier,
  });

  final String phone;
  final String licensePlate;
  final VehicleTier tier;

  @override
  List<Object?> get props => [phone, licensePlate, tier];
}
