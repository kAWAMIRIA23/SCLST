import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../core/constants/app_colors.dart';
import '../../data/models/booking_offer_model.dart';
import '../blocs/dispatch/dispatch_bloc.dart';
import 'countdown_timer.dart';

class DispatchOverlay extends StatelessWidget {
  const DispatchOverlay({
    super.key,
    required this.offer,
    required this.secondsRemaining,
  });

  final BookingOfferModel offer;
  final int secondsRemaining;

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat('#,###', 'en_UG');

    return Material(
      color: Colors.transparent,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(top: BorderSide(color: AppColors.cardBorder)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'New Booking Offer',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _row('Pickup', offer.pickupAddress),
            _row('Dropoff', offer.dropoffAddress),
            _row('Cargo', offer.cargoType),
            _row('Payload', '${offer.payloadWeightTonnes} t'),
            _row('Fare', 'UGX ${currency.format(offer.fareUGX)}'),
            const SizedBox(height: 20),
            Row(
              children: [
                CountdownTimer(secondsRemaining: secondsRemaining),
                const Spacer(),
                OutlinedButton(
                  onPressed: () =>
                      context.read<DispatchBloc>().add(const OfferDeclined()),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    side: const BorderSide(color: AppColors.danger),
                  ),
                  child: const Text('Decline'),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: () =>
                      context.read<DispatchBloc>().add(const OfferAccepted()),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Accept'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 72,
            child: Text(
              label,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
