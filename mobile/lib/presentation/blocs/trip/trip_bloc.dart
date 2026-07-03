import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../data/models/booking_offer_model.dart';
import '../../../data/models/driver_model.dart';
import '../../../domain/entities/driver.dart';
import '../../../domain/usecases/toggle_online_status.dart';
import '../../../data/repositories/trip_repository.dart';

part 'trip_event.dart';
part 'trip_state.dart';

class TripBloc extends Bloc<TripEvent, TripState> {
  TripBloc({
    required ToggleOnlineStatus toggleOnlineStatus,
    required TripRepository tripRepository,
    required DriverModel driver,
  })  : _toggleOnlineStatus = toggleOnlineStatus,
        _tripRepository = tripRepository,
        super(TripOffline(driver)) {
    on<ToggleOnlineStatusEvent>(_onToggleOnlineStatus);
    on<DeliveryConfirmed>(_onDeliveryConfirmed);
    on<ActiveTripStarted>(_onActiveTripStarted);
  }

  final ToggleOnlineStatus _toggleOnlineStatus;
  final TripRepository _tripRepository;

  Future<void> _onToggleOnlineStatus(
    ToggleOnlineStatusEvent event,
    Emitter<TripState> emit,
  ) async {
    final currentDriver = _currentDriver;
    emit(TripLoading(currentDriver));
    try {
      final status = await _toggleOnlineStatus(event.isOnline);
      final updated = currentDriver.copyWith(
        status: status == DriverStatus.ONLINE
            ? DriverStatus.ONLINE
            : DriverStatus.OFFLINE,
      );
      if (status == DriverStatus.ONLINE) {
        emit(TripOnline(updated));
      } else {
        emit(TripOffline(updated));
      }
    } catch (e) {
      emit(TripError(currentDriver, e.toString()));
    }
  }

  Future<void> _onDeliveryConfirmed(
    DeliveryConfirmed event,
    Emitter<TripState> emit,
  ) async {
    final current = state;
    if (current is! TripActive) return;

    emit(TripLoading(current.driver));
    try {
      await _tripRepository.confirmDelivery(current.offer.bookingId);
      emit(TripOnline(current.driver));
    } catch (e) {
      emit(TripError(current.driver, e.toString()));
    }
  }

  void _onActiveTripStarted(ActiveTripStarted event, Emitter<TripState> emit) {
    final currentDriver = _currentDriver;
    emit(TripActive(currentDriver, event.offer));
  }

  DriverModel get _currentDriver {
    final current = state;
    if (current is TripOffline) return current.driver;
    if (current is TripOnline) return current.driver;
    if (current is TripActive) return current.driver;
    if (current is TripLoading) return current.driver;
    if (current is TripError) return current.driver;
    return const DriverModel(
      id: '',
      name: '',
      phone: '',
      licensePlate: '',
      tier: VehicleTier.SMALL,
    );
  }
}
