# Google Cloud Storage

This file documents how to configure Google Cloud Storage to use on your
machine.

To work on this project this isn't mandatory: it's possible to use a mocked
version of the service as described below.

## Configure your local development instance to use GCS

Copy the file `.env.example` to `.env`, then edit it in your favorite editor
following the embedded comments.

If you're using the Mozilla project, the bucket name you can use is
`profile-store-julien-dev`. Otherwise please use the one you create following
the section below.

## Configure your local development instance to use a mock version of GCS

Create a file in your project directory, called `.env`. Here is the
content it should have:

```
GCS_AUTHENTICATION_PATH="MOCKED"
JWT_SECRET="<something you choose>"
```

## Configure Google platform for this project.

If you're a Mozilla employee, you can [jump directly to the last paragraph in
this section](#youre-a-mozilla-employee).

Otherwise you can start following the steps starting at the first paragraph.

### Create a project

Here we'll create a new project in the Google Cloud Platform ecosystem.

1. Connect to [your cloud console](https://console.cloud.google.com/). Take care
   that you use the Google account you want from the top right menu.
2. Click `Select a project` at the top, then choose `New Project` at the top
   right of the modal.

### Configure Google Storage

In this part we'll create a socalled _bucket_ to hold our uploaded data.

1. Select the option `Storage > Storage` in the menu at the left. Note: you can
   pin this option so that you can always find it at the top of this menu. [You
   can also bookmark this direct link](https://console.cloud.google.com/storage/browser).
2. To enable this API you'll need to sign up for a free trial, including
   configuring your billing and payment options. You'll have the option to
   access it from this page if it's not done yet.
   **As said above configuring GCS isn't necessary to contribute to this project.**

### Create the `profile publisher` role

Then we'll create a role to make it easier to configure permissions, and update
them in the future.

1. Access the Role configuration through [IAM > Roles](https://console.cloud.google.com/iam-admin/roles).
2. Click on `Create role` at the top of the page.
3. You can name this role `profile publisher` and change the description if you
   wish. You can also change the ID name to `profile.publisher`, and the _Role launch
   stage_ to `General Availability`.
4. Then you can add some permissions. To search for the permissions, you can
   enter terms in the _Filter table_ input, **not** the _Filter permissions by role_
   input.
   You can search for `storage.objects`, and select the following permissions:
   - `storage.objects.create`: allows to create objects
   - `storage.objects.delete`: allows to overwrite existing objects
   - `storage.buckets.get`: allows to check if the bucket exists
5. Finally click on `Create` at the bottom.

### Create a Service Account

In this part we'll create a service account with the _profile publisher_
role that can access the API. We prefer to have a different account for each
developer rather than share the account.

You can follow these steps:

1. Connect to [IAM > Service accounts part in your console](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. Make sure the right project is selected at the top. If you have several
   Google accounts, you might need to change your Google account at the top
   right as well.
3. Click on the button `Create service account` near the top of the page.
4. Chose a descriptive name, like `profiler-server-<name>-dev`. You can add a
   description as well.
5. Don't create any new role yet, we'll assign some more later.
6. Click on `Create key`, and download it as JSON. Store it on your local disk.
7. Keep the full email for this account in your clipboard, as we'll need it
   later.

### Create a bucket and assign the right permissions to the service account

In this paragraph we'll create a new bucket and assign permissions to the
previously created service account.

1. Now you can create a bucket from the [Storage
   browser](https://console.cloud.google.com/storage/browser). According to the
   [Google princing page](https://cloud.google.com/storage/pricing), if you
   choose the regions `us-west1`, `us-central1`, or `us-east1` it should be free
   if you stay below some threshold. Otherwise keep the other options at their
   default values.
2. Now from the same browser you can select the newly created bucket by clicking
   its checkbox. At the right panel you can click _Add member_.
3. Copy the full service account email in the field, then press Enter. (_Don't
   use the autocomplete box as sometimes it doesn't work properly._)
4. In the _Role_ part, look for `profile publisher` and add it.
5. Finally _save_ the form.

### You're a Mozilla employee

If you're a Mozilla employee, you can instead request access to the project
`moz-fx-dev-jwajsberg-profiler`, part of the Mozilla GCP instance.

Then you can create a service account and assign the right permissions for this
new account to the existing bucket in the project as outlined above. Note that
this bucket will be emptied from time to time.
