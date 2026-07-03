import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class CountdownTimer extends StatelessWidget {
  const CountdownTimer({
    super.key,
    required this.secondsRemaining,
    this.totalSeconds = 15,
  });

  final int secondsRemaining;
  final int totalSeconds;

  @override
  Widget build(BuildContext context) {
    final progress = secondsRemaining / totalSeconds;

    return SizedBox(
      width: 72,
      height: 72,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: progress.clamp(0.0, 1.0),
            color: AppColors.amber,
            backgroundColor: AppColors.cardBorder,
            strokeWidth: 5,
          ),
          Text(
            '$secondsRemaining',
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
        ],
      ),
    );
  }
}
