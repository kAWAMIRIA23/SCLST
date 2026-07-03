import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../core/constants/app_config.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/network/websocket_client.dart';
import '../../../data/models/booking_offer_model.dart';
import '../../../data/models/driver_model.dart';
import '../../../data/repositories/trip_repository.dart';
import '../../../domain/usecases/accept_booking.dart';
import '../../../injection.dart';
import '../../blocs/dispatch/dispatch_bloc.dart';
import '../../blocs/trip/trip_bloc.dart';
import '../../widgets/dispatch_overlay.dart';
import '../trip/active_trip_screen.dart';

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key, required this.driver});

  final DriverModel driver;

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  bool _showOverlay = false;

  @override
  void initState() {
    super.initState();
    sl<WebSocketClient>().connect(
      '${AppConfig.wsTelemetryUrl}?driver_id=${widget.driver.id}',
    );
    sl<WebSocketClient>().messages.listen((message) {
      if (message['booking_id'] != null && mounted) {
        context.read<DispatchBloc>().add(
              OfferReceived(BookingOfferModel.fromJson(message)),
            );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat('#,###', 'en_UG');

    return BlocConsumer<TripBloc, TripState>(
      listener: (context, tripState) {
        // no-op
      },
      builder: (context, tripState) {
        final driver = tripState.driver;
        final isOnline = tripState is TripOnline || tripState is TripActive;

        return BlocListener<DispatchBloc, DispatchState>(
          listener: (context, dispatchState) {
            if (dispatchState is DispatchOfferReceived) {
              setState(() => _showOverlay = true);
            } else if (dispatchState is DispatchAccepted) {
              setState(() => _showOverlay = false);
              sl<AcceptBooking>()(dispatchState.offer.bookingId);
              context.read<TripBloc>().add(ActiveTripStarted(dispatchState.offer));
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => BlocProvider.value(
                    value: context.read<TripBloc>(),
                    child: const ActiveTripScreen(),
                  ),
                ),
              );
            } else {
              setState(() => _showOverlay = false);
            }
          },
          child: Scaffold(
            backgroundColor: AppColors.background,
            body: Stack(
              children: [
                SafeArea(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: AppColors.primary,
                              child: Text(
                                driver.name.isNotEmpty
                                    ? driver.name.substring(0, 1).toUpperCase()
                                    : 'D',
                                style: const TextStyle(color: Colors.white),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    driver.name,
                                    style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Container(
                                    margin: const EdgeInsets.only(top: 4),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      driver.tier.name,
                                      style: const TextStyle(
                                        color: AppColors.primary,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Switch(
                              value: isOnline,
                              activeThumbColor: AppColors.success,
                              inactiveThumbColor: AppColors.amber,
                              onChanged: (value) => context
                                  .read<TripBloc>()
                                  .add(ToggleOnlineStatusEvent(value)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isOnline
                                ? AppColors.success.withValues(alpha: 0.15)
                                : AppColors.amber.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            isOnline ? 'ONLINE — Ready for dispatch' : 'OFFLINE — Go online to receive offers',
                            style: TextStyle(
                              color: isOnline ? AppColors.success : AppColors.amber,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        if (kDebugMode && isOnline)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: OutlinedButton(
                              onPressed: () async {
                                try {
                                  await sl<TripRepository>().simulateDispatch();
                                } catch (e) {
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Dispatch failed: $e')),
                                    );
                                  }
                                }
                              },
                              child: const Text('Simulate dispatch offer'),
                            ),
                          ),
                        Row(
                          children: [
                            _summaryCard('Trips', '${driver.completedTrips}'),
                            const SizedBox(width: 12),
                            _summaryCard(
                              'Total KM',
                              driver.totalKmDriven.toStringAsFixed(1),
                            ),
                            const SizedBox(width: 12),
                            _summaryCard(
                              'Net UGX',
                              currency.format(driver.netPayoutUGX),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                AnimatedSlide(
                  offset: _showOverlay ? Offset.zero : const Offset(0, 1),
                  duration: const Duration(milliseconds: 350),
                  curve: Curves.easeOut,
                  child: BlocBuilder<DispatchBloc, DispatchState>(
                    builder: (context, state) {
                      if (state is DispatchOfferReceived) {
                        return Align(
                          alignment: Alignment.bottomCenter,
                          child: DispatchOverlay(
                            offer: state.offer,
                            secondsRemaining: state.secondsRemaining,
                          ),
                        );
                      }
                      return const SizedBox.shrink();
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _summaryCard(String label, String value) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              const SizedBox(height: 6),
              Text(
                value,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
