# DecisionTree
HTML5 D3 SVG based decision tree 

## Hosting

The site in `DecisionTree/` is deployed to Azure Static Web Apps (Free tier) by
`.github/workflows/azure-static-web-apps.yml` on every push to `master`; pull
requests get a temporary staging URL.

One-time setup:

1. In the Azure portal create a **Static Web App**, plan **Free**, deployment
   source **Other** (the workflow in this repo does the deploying).
2. Copy its **deployment token** (Overview → Manage deployment token) into a
   GitHub repository secret named `AZURE_STATIC_WEB_APPS_API_TOKEN`.
3. Under **Custom domains** add `decision.infiniteresolution.biz` and create the
   CNAME it asks for, pointing at the app's `*.azurestaticapps.net` host. SSL is
   issued automatically.
4. Once the new host serves correctly, remove the Front Door / CDN profile and
   disable static website hosting on the storage account.
