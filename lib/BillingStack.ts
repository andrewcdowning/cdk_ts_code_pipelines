import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Budget } from "./constructs/Budget";


interface BillingStackProps extends StackProps {
    emailAddress: string,
    threshold: number,
    amount: number

}
export class BillingStack extends Stack{
    constructor(scope: Construct, id: string, props: BillingStackProps) {
        super(scope, id, props)

        new Budget(this, "BudgetStack", {
            amount: props.amount,
            threshold: props.threshold,
            type: "EMAIL",
            address: props.emailAddress
        })
    }
}