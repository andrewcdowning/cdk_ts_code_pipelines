import { CfnBudget } from "aws-cdk-lib/aws-budgets";
import { ComparisonOperator } from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";

interface BudgetProps {
    threshold: number,
    amount: number,
    type: "EMAIL" | "SNS",
    address: string

}

export class Budget extends Construct {
    constructor(scope: Construct, id: string, props: BudgetProps) {
        super(scope, id)
        
        new CfnBudget(this, "budget", {
            budget: {
                budgetLimit: {
                    amount: props.amount,
                    unit: "USD"
                },
                budgetType: "COST",
                timeUnit: "MONTHLY"
            },
            notificationsWithSubscribers: [
                {
                    notification: {
                        threshold: props.threshold,
                        notificationType: "FORECASTED",
                        thresholdType: "PERCENTAGE",
                        comparisonOperator: "GREATER_THAN"
                    },
                    subscribers: [
                        {
                            subscriptionType: props.type,
                            address: props.address
                        }

                    ]
                }
            ]
        });
    }
}