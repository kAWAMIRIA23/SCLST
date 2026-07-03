import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../data/models/booking_offer_model.dart';

part 'dispatch_event.dart';
part 'dispatch_state.dart';

class DispatchBloc extends Bloc<DispatchEvent, DispatchState> {
  DispatchBloc() : super(const DispatchIdle()) {
    on<OfferReceived>(_onOfferReceived);
    on<OfferAccepted>(_onOfferAccepted);
    on<OfferDeclined>(_onOfferDeclined);
    on<CountdownTicked>(_onCountdownTicked);
  }

  Timer? _countdownTimer;

  void _onOfferReceived(OfferReceived event, Emitter<DispatchState> emit) {
    _countdownTimer?.cancel();
    emit(DispatchOfferReceived(event.offer, 15));

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      final remaining = 15 - timer.tick;
      if (remaining <= 0) {
        add(const CountdownTicked(0));
      } else {
        add(CountdownTicked(remaining));
      }
    });
  }

  void _onOfferAccepted(OfferAccepted event, Emitter<DispatchState> emit) {
    _countdownTimer?.cancel();
    final current = state;
    if (current is DispatchOfferReceived) {
      emit(DispatchAccepted(current.offer));
    }
  }

  void _onOfferDeclined(OfferDeclined event, Emitter<DispatchState> emit) {
    _countdownTimer?.cancel();
    emit(const DispatchDeclined());
  }

  void _onCountdownTicked(CountdownTicked event, Emitter<DispatchState> emit) {
    if (event.secondsRemaining <= 0) {
      _countdownTimer?.cancel();
      emit(const DispatchExpired());
      return;
    }

    final current = state;
    if (current is DispatchOfferReceived) {
      emit(DispatchOfferReceived(current.offer, event.secondsRemaining));
    }
  }

  @override
  Future<void> close() {
    _countdownTimer?.cancel();
    return super.close();
  }
}
