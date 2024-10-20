import { setFeature } from "@aws-sdk/core";
export async function checkFeatures(context, config, args) {
    const request = args.request;
    if (typeof config.accountIdEndpointMode === "function") {
        switch (await config.accountIdEndpointMode?.()) {
            case "disabled":
                setFeature(context, "ACCOUNT_ID_MODE_DISABLED", "Q");
                break;
            case "preferred":
                setFeature(context, "ACCOUNT_ID_MODE_PREFERRED", "P");
                break;
            case "required":
                setFeature(context, "ACCOUNT_ID_MODE_REQUIRED", "R");
                break;
        }
    }
}
