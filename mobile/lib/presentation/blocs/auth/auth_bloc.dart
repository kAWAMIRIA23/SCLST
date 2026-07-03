import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../data/models/driver_model.dart';
import '../../../domain/entities/driver.dart';
import '../../../domain/usecases/submit_onboarding.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({required SubmitOnboarding submitOnboarding})
      : _submitOnboarding = submitOnboarding,
        super(const AuthInitial()) {
    on<OnboardingSubmitted>(_onOnboardingSubmitted);
  }

  final SubmitOnboarding _submitOnboarding;

  Future<void> _onOnboardingSubmitted(
    OnboardingSubmitted event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final driver = await _submitOnboarding(
        phone: event.phone,
        licensePlate: event.licensePlate,
        tier: event.tier,
      );
      emit(AuthSuccess(driver));
    } catch (e) {
      emit(AuthFailure(e.toString()));
    }
  }
}
