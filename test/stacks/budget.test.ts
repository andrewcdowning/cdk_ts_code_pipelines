import { App } from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { BillingStack } from '../../lib/BillingStack';


test('Budget Constructs', () => {
    const app = new App();
    const billingStack = new BillingStack(app, 'BillingStack', {
        emailAddress: 'test@test.com',
        amount: 100,
        threshold: 1
    });

    const template = Template.fromStack(billingStack);
    template.hasResourceProperties('AWS::Budgets::Budget', {
        Budget: {
            BudgetLimit: {
                Amount: 100
            }
        },
        NotificationsWithSubscribers: [
            {
                Subscribers: [
                    {
                        Address: 'test@test.com'
                    }
                ]
            }
        ]
    })
})