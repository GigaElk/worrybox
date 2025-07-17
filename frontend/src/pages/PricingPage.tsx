import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SubscriptionPricing from '../components/SubscriptionPricing'

const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>

        {/* Pricing Component */}
        <SubscriptionPricing />

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h3>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                Can I cancel my subscription anytime?
              </h4>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time. You'll continue to have access 
                to premium features until the end of your current billing period.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                Is my data safe and private?
              </h4>
              <p className="text-gray-600">
                Absolutely. We take privacy seriously and use industry-standard encryption to 
                protect your data. Your worries and personal information are never shared with 
                third parties.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h4>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, MasterCard, American Express) and 
                PayPal through our secure payment processor, LemonSqueezy.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                Can I upgrade or downgrade my plan?
              </h4>
              <p className="text-gray-600">
                Yes, you can upgrade your plan at any time. Downgrades take effect at the end 
                of your current billing period to ensure you get the full value of what you've paid for.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                Do you offer refunds?
              </h4>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee for all paid plans. If you're not 
                satisfied within the first 30 days, contact us for a full refund.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Have more questions? We're here to help.
          </p>
          <a
            href="mailto:support@worrybox.app"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}

export default PricingPage