import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../core/constants/app_colors.dart';
import '../../../data/models/telemetry_model.dart';
import '../../../domain/usecases/stream_telemetry.dart';
import '../../../injection.dart';
import '../../blocs/trip/trip_bloc.dart';
import '../../widgets/slide_to_confirm.dart';

class ActiveTripScreen extends StatefulWidget {
  const ActiveTripScreen({super.key});

  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  StreamSubscription<Position>? _positionSub;
  Timer? _telemetryTimer;
  Position? _lastPosition;
  final _streamTelemetry = sl<StreamTelemetry>();

  @override
  void initState() {
    super.initState();
    _initLocationAndTelemetry();
  }

  Future<void> _initLocationAndTelemetry() async {
    final hasPermission = await _ensureLocationPermission();
    if (!hasPermission) {
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/permission-denied');
      }
      return;
    }

    if (!kIsWeb) {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled && mounted) {
        Navigator.of(context).pushReplacementNamed('/permission-denied');
        return;
      }
    }
    await _streamTelemetry.connect();

    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((position) => _lastPosition = position);

    _telemetryTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _sendTelemetry();
    });
  }

  Future<bool> _ensureLocationPermission() async {
    if (kIsWeb) {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      return permission == LocationPermission.always ||
          permission == LocationPermission.whileInUse;
    }

    final permission = await Permission.locationWhenInUse.request();
    return permission.isGranted;
  }

  void _sendTelemetry() {    final tripState = context.read<TripBloc>().state;
    if (tripState is! TripActive || _lastPosition == null) return;

    try {
      _streamTelemetry.sendTelemetry(
        TelemetryModel(
          driverId: tripState.driver.id,
          latitude: _lastPosition!.latitude,
          longitude: _lastPosition!.longitude,
          bookingId: tripState.offer.bookingId,
          timestamp: DateTime.now().toUtc(),
        ),
      );
    } catch (_) {
      // telemetry send failures are non-blocking
    }
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    _telemetryTimer?.cancel();
    _streamTelemetry.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<TripBloc, TripState>(
      builder: (context, state) {
        if (state is! TripActive) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final offer = state.offer;

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: const Text('Active Trip'),
            backgroundColor: AppColors.surface,
          ),
          body: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _checkpoint('Pickup', offer.pickupAddress, true),
                      Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: Container(
                          width: 2,
                          height: 40,
                          color: AppColors.cardBorder,
                        ),
                      ),
                      _checkpoint('Dropoff', offer.dropoffAddress, false),
                    ],
                  ),
                ),
                SlideToConfirm(
                  label: 'Slide to confirm delivery',
                  onConfirmed: () {
                    context.read<TripBloc>().add(const DeliveryConfirmed());
                    Navigator.of(context).pop();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _checkpoint(String label, String address, bool filled) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          Icons.circle,
          size: 10,
          color: filled ? AppColors.success : AppColors.textSecondary,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: AppColors.textSecondary)),
              Text(
                address,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
