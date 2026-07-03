import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/constants/app_colors.dart';
import '../../../domain/entities/driver.dart';
import '../../blocs/auth/auth_bloc.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageController = PageController();
  final _phoneController = TextEditingController();
  final _plateController = TextEditingController();
  VehicleTier _tier = VehicleTier.SMALL;
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    _phoneController.dispose();
    _plateController.dispose();
    super.dispose();
  }

  void _next() {
    if (_currentPage < 2) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      context.read<AuthBloc>().add(
            OnboardingSubmitted(
              phone: _phoneController.text.trim(),
              licensePlate: _plateController.text.trim().toUpperCase(),
              tier: _tier,
            ),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthSuccess) {
          Navigator.of(context).pushReplacementNamed(
            '/home',
            arguments: state.driver,
          );
        } else if (state is AuthFailure) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
        }
      },
      builder: (context, state) {
        final loading = state is AuthLoading;

        return Scaffold(
          backgroundColor: AppColors.background,
          body: Stack(
            children: [
              SafeArea(
                child: Column(
                  children: [
                    Expanded(
                      child: PageView(
                        controller: _pageController,
                        physics: const NeverScrollableScrollPhysics(),
                        onPageChanged: (index) =>
                            setState(() => _currentPage = index),
                        children: [
                          _phoneStep(),
                          _vehicleStep(),
                          _documentsStep(),
                        ],
                      ),
                    ),
                    _progressDots(),
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: loading ? null : _next,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(_currentPage == 2 ? 'Submit' : 'Next'),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (loading)
                Container(
                  color: Colors.black54,
                  child: const Center(child: CircularProgressIndicator()),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _phoneStep() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Step 1 — Phone Number',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Phone number',
              prefixText: '+256 ',
            ),
          ),
        ],
      ),
    );
  }

  Widget _vehicleStep() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Step 2 — Vehicle Details',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          TextFormField(
            controller: _plateController,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(labelText: 'License plate'),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<VehicleTier>(
            initialValue: _tier,
            dropdownColor: AppColors.surface,
            decoration: const InputDecoration(labelText: 'Vehicle tier'),
            items: VehicleTier.values
                .map(
                  (tier) => DropdownMenuItem(
                    value: tier,
                    child: Text(tier.name),
                  ),
                )
                .toList(),
            onChanged: (value) {
              if (value != null) setState(() => _tier = value);
            },
          ),
        ],
      ),
    );
  }

  Widget _documentsStep() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Step 3 — Documents',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          _uploadCard("Driver's Permit"),
          const SizedBox(height: 16),
          _uploadCard('Transit Approval'),
        ],
      ),
    );
  }

  Widget _uploadCard(String label) {
    return InkWell(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Document upload coming soon')),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.cardBorder.withValues(alpha: 0.8),
            width: 1.5,
          ),
        ),
        child: Column(
          children: [
            Icon(Icons.upload_file, color: AppColors.primary.withValues(alpha: 0.9)),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(color: AppColors.textPrimary)),
          ],
        ),
      ),
    );
  }

  Widget _progressDots() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (index) {
        final active = index == _currentPage;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: active ? 24 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: active ? AppColors.primary : AppColors.cardBorder,
            borderRadius: BorderRadius.circular(8),
          ),
        );
      }),
    );
  }
}
