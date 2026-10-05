import Link from 'next/link';
import { legal } from '@/lib/legal';
const Contact=()=> <a href={`mailto:${legal.email}`}>{legal.email}</a>;

export function PrivacyEnglish(){return <>
  <p>This policy explains how Smart Box, a web service for organizing belongings in boxes and sharing access through QR links, processes data. It applies to account owners, guests using shared links and visitors to <a href={legal.origin}>{legal.origin}</a>.</p>
  <section><h2>1. Who is responsible for the service</h2><p>The service is operated by Nataliia (Smart Box). For questions about privacy, access to data or deletion, contact <Contact/>. Guests without an account can also use this address.</p></section>
  <section><h2>2. Data we receive</h2><ul>
    <li><strong>Google profile data:</strong> your Google account identifier, name, email, email verification information and profile image URL provided by Google at sign-in. We do not receive your Google password.</li>
    <li><strong>Authorization data:</strong> session identifiers and expiry times, Google permissions, and OAuth access/refresh tokens for Drive operations. Tokens are stored encrypted on the server.</li>
    <li><strong>Inventory:</strong> box and item names and descriptions, numbers, box order, ownership, access settings, random QR tokens, creation/update dates, deletion markers and activity history.</li>
    <li><strong>Photos:</strong> images you select or take and upload; Drive folder and file IDs, filenames, sizes and processing status. The service does not browse your entire device photo library.</li>
    <li><strong>Guest activity:</strong> changes to a box and their time. In the current version, these actions are labelled “Guest” without identifying the guest; this does not mean that technical logs do not exist.</li>
    <li><strong>Technical data:</strong> IP address, browser and device information, request URL, time and result may be processed by the hosting provider and Google to deliver and protect the service. To limit request rates, Smart Box stores hashed keys derived from an IP address or user/link identifier and counters. Hashing does not guarantee anonymity.</li>
    <li><strong>Support requests:</strong> your email address, message and any attachments you provide.</li>
  </ul></section>
  <section><h2>3. Why Google access is needed</h2>
    <p>The <code>openid</code>, <code>email</code> and <code>profile</code> permissions are used to sign in, create your account and identify the owner of boxes.</p>
    <p>The <code>https://www.googleapis.com/auth/drive.file</code> permission is used to create the Smart Box/Photos folder and upload, read and delete photos accessible to this application. It does not grant general access to every file in your Google Drive. The current interface works with photos uploaded through Smart Box.</p>
    <p>We store a refresh token so the server can retrieve and upload photos while the owner is offline. For example, a guest with EDIT access can add a photo to the box owner’s Drive. The owner’s Google tokens are never sent to guests or client-side code.</p>
    <p>Denying or revoking Drive access makes photo operations unavailable. Existing text entries are not automatically deleted when access is revoked.</p>
  </section>
  <section><h2>4. How data is used</h2>
    <p>We use data for sign-in, saving and finding belongings, displaying photos, sharing access, activity history, restoring or permanently deleting items, responding to requests, diagnosing errors and preventing abuse.</p>
    <p>Where the GDPR or similar legislation applies, the legal bases are performance of the service agreement (core features), legitimate interests in security and support, compliance with legal obligations, and consent where required. You may revoke Google permissions; doing so does not affect the lawfulness of earlier processing.</p>
    <p>We do not sell personal data or use Google data for advertising, ad profiling, credit scoring, or training generalized AI/ML models. The current version has no AI photo recognition, advertising trackers or connected product analytics. If recognition is added, we will first explain which photos are sent to which provider, update this policy and obtain any required consent.</p>
    <p><strong>Google API Limited Use.</strong> Smart Box’s use of information received from Google APIs, and its transfer of that information to other applications, will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements. Human access to this data is limited to your explicit consent for specific assistance, necessary security/abuse investigations, or legal requirements.</p>
  </section>
  <section><h2>5. Who can access a box through a QR link</h2><ul>
    <li><strong>VIEW:</strong> anyone with a valid link can see the box’s contents and photos without registering.</li>
    <li><strong>EDIT:</strong> guests can also add, edit and remove items. Replacing or removing an item’s photo also triggers deletion of the old Drive file after saving.</li>
    <li><strong>PRIVATE:</strong> guest access is disabled; the owner manages the box in their account.</li>
  </ul>
    <p>A QR link is an access key. It can be forwarded, so access is not limited to people who physically see the label. The owner controls the access mode and can replace the QR token. This stops future access through the old link but cannot erase copies, downloads or screenshots someone already made.</p>
    <p>Files are not published using Drive’s “Anyone with the link” setting: Smart Box retrieves a private photo on the server and serves it after checking box access. The guest API does not disclose the owner’s email or Google tokens. Names, descriptions and images may themselves contain personal information you choose to add. Guests should understand that their uploaded file is stored in the owner’s Drive and the owner will have access to it.</p>
  </section>
  <section><h2>6. Storage and service providers</h2><ul>
    <li><strong>Google:</strong> sign-in, OAuth consent and photo storage in the owner’s Drive. The <a href="https://policies.google.com/privacy">Google Privacy Policy</a> also applies.</li>
    <li><strong>Neon:</strong> the PostgreSQL database storing profiles, sessions, encrypted tokens, inventory, history and photo references. Photo binary data is not stored in this database. See <a href="https://neon.com/privacy-policy">Neon’s privacy policy</a>.</li>
    <li><strong>Vercel:</strong> hosting, server-side execution, request processing, temporary transit of images during upload and display, and technical logs. See <a href="https://vercel.com/legal/privacy-policy">Vercel’s privacy policy</a>.</li>
  </ul>
    <p>Data is shared with these providers to deliver the service. While the main database and server execution are configured in London, global infrastructure, support and subprocessors may process data in other countries. We do not promise that all data stays in a single country; international transfers are subject to applicable law and appropriate contractual safeguards with providers where required.</p>
    <p>Disclosure may also occur where legally required or necessary to protect rights and security. Providers may process some technical data for their own lawful purposes as described in their policies.</p>
  </section>
  <section><h2>7. Cookies and security</h2>
    <p>We use necessary cookies for sessions, OAuth sign-in, request protection and your interface language preference. Sign-in may not work without authentication cookies. Your language preference is saved in a cookie for up to one year and can be changed using UA / EN or removed in browser settings. We do not store Google passwords; OAuth tokens are encrypted on the server and production connections use HTTPS. Data access requires ownership or valid QR access.</p>
    <p>Images may be resized and converted to JPEG; the server strips embedded metadata when re-encoding. This does not remove personal information visibly present in a photo. No system guarantees absolute security. If you suspect a leaked QR link or compromised account, change access and contact us.</p>
  </section>
  <section><h2>8. Retention and deletion</h2><ul>
    <li>Profiles, inventory, settings and history are retained to operate the account. The current version does not automatically delete inactive accounts; complete deletion can be requested by email.</li>
    <li>“Remove” hides an item and lets its owner restore it. Its photo remains. “Delete permanently” deletes the item record and initiates permanent deletion of its Drive photo. The item name and events may remain in the box’s history until the history/account is deleted on request.</li>
    <li>Replacing or removing a photo initiates permanent deletion of the old file. If Drive is unavailable, the task is saved for retry, so deletion may not be immediate.</li>
    <li>Deleting an entire box in the interface hides it and disables guest access but does not fully erase its records or photos. Contact us for complete erasure.</li>
    <li>Unattached uploads may be removed by a maintenance procedure after 24 hours. This is when they become eligible for cleanup, not a guarantee of deletion exactly after one day. Expired rate counters are also removed during maintenance.</li>
    <li>Google tokens are retained while needed for the connection; account deletion on request includes deleting tokens and sessions from our active database. Revoking access in Google does not by itself delete inventory or photos.</li>
  </ul>
    <p>Technical logs and backups may be retained longer than active records under provider policies and settings. They are not used to restore normal access to a deleted account. Data that must be retained by law or for a specific dispute may be kept only for that purpose. On request, we will clarify available retention periods and the scope of deletion for your case.</p>
  </section>
  <section><h2>9. Your rights, account deletion and revoking Google access</h2>
    <p>You can edit entries and access settings in the interface. To request a copy of data, correction, deletion of your account, history or other personal information, email <Contact/>, preferably from your account email. State the action you want; do not send passwords, OAuth tokens or a full QR link. We may request minimal information to verify your right to make the request. Guests can provide the box name, item and approximate time of the action.</p>
    <p>Full account deletion is currently handled manually, not by an in-app button. Specify whether you also want Smart Box photos deleted from your Drive. The service needs valid permission to delete them; if access has already been revoked, you can delete the folder or files directly in Drive. Deletion in Drive does not automatically delete Smart Box text entries.</p>
    <p>You can revoke access in your <a href="https://myaccount.google.com/connections">Google account connections settings</a> by selecting Smart Box (the consent screen name may be Smart Box Home Inventory). New Drive operations on your behalf may then stop working.</p>
    <p>Depending on applicable law, you may also have rights to restrict processing, object, obtain portability, withdraw consent and complain to the data protection authority where you live. We respond within legally required periods; GDPR requests are generally handled within one month, with notice of a lawful extension if needed.</p>
  </section>
  <section><h2>10. Children and policy updates</h2>
    <p>Smart Box is intended for adults organizing belongings, not for collecting children’s data. Do not add unnecessary personal data about children or other people. If such information enters the service without an appropriate basis, contact us.</p>
    <p>The current policy is always available at this URL. We will notify users in the interface or by email before materially changing how personal data is used and will request separate consent where required. See also our <Link href="/terms">Terms of Service</Link>.</p>
  </section>
</>;}

export function TermsEnglish(){return <>
  <p>These terms govern use of Smart Box at <a href={legal.origin}>{legal.origin}</a>. The service is operated by Nataliia (Smart Box); contact: <Contact/>. By creating an account or acting on a box’s contents, you accept these terms. If you disagree, do not create an account or use the service’s features.</p>
  <section><h2>1. What Smart Box provides</h2>
    <p>Smart Box is a household tool for cataloguing boxes, belongings and photos, searching and sharing through QR links. The service does not hold physical belongings and is not evidence of their existence, ownership, condition or value. The current version has no subscription charge; availability and quotas of external services may limit its operation.</p>
    <p>The service is intended for adults with the capacity to enter this agreement. Keeping information about children’s toys does not make this a service for children.</p>
  </section>
  <section><h2>2. Accounts and Google connection</h2>
    <p>Owners sign in with Google; the first sign-in creates a Smart Box account. You are responsible for the security of your Google account and devices. Do not use another person’s account without permission. We do not request your Google password.</p>
    <p>For photos, you authorize Smart Box to work with Drive files accessible to the application through <code>drive.file</code>, including actions by guests you authorize. Files use the owner’s Drive quota. Revoking permission, deleting files in Drive, account restrictions or exhausted storage can make photos unavailable.</p>
  </section>
  <section><h2>3. Sharing and guest actions</h2><p>The owner chooses a box’s access mode:</p><ul>
    <li><strong>VIEW:</strong> anyone with a valid QR link can view items and photos without signing in.</li>
    <li><strong>EDIT:</strong> anyone with the link can also add, edit and remove items. Replacing or removing an item’s photo can permanently delete the previous Drive file.</li>
    <li><strong>PRIVATE:</strong> guest access is disabled.</li>
  </ul>
    <p>Only the owner can manage box settings, rename or delete a box, replace its QR, view activity history, restore items and permanently delete removed items. Guest actions are recorded as “Guest” and do not verify the identity of a particular person.</p>
    <p>Sharing a link grants its recipients the selected access. Links can be forwarded to others. Change the mode or QR when access is no longer needed. Revocation cannot erase copies already made by others. Guests must act within the owner’s permission and must not use access to cause harm.</p>
  </section>
  <section><h2>4. Your content and rights</h2>
    <p>You retain the rights you have in uploaded text and photos. You grant Smart Box a non-exclusive permission to process, store, resize, convert and display that content solely to provide the service and sharing you select. This does not grant us permission to sell your content, use it in advertising or train generalized AI models on it.</p>
    <p>You must have the right to add content and share any personal information it contains. A photo you add as a guest is stored in the box owner’s Drive and is available to the owner and others according to the box settings.</p>
    <p>To report a rights violation, email the contact address with a description of the material and the basis for your request. Do not send passwords or access secrets.</p>
  </section>
  <section><h2>5. Acceptable use</h2>
    <p>Do not upload illegal content, harmful files or material infringing others’ rights. Do not bypass access checks, guess QR tokens, interfere with other people’s boxes, send spam or generate load intended to disrupt the service. Do not use Smart Box to store passwords, payment credentials, identity documents or other particularly sensitive information.</p>
    <p>Technical file-size and request-rate limits protect stability and security. They may change with the service’s available resources.</p>
  </section>
  <section><h2>6. Deletion and ending use</h2>
    <p>“Remove” moves an item to the section for recovery. “Delete permanently” deletes its record and initiates permanent deletion of its Drive photo. Saving a replacement photo also deletes the previous one. These file operations cannot be undone through Smart Box; Drive failures may delay deletion and require a retry.</p>
    <p>Deleting a whole box hides it and stops QR access but does not currently erase all related records and files automatically. Activity history may contain names of already deleted items.</p>
    <p>You can stop using the service at any time. For full account or data deletion, contact <Contact/>. Specify whether Drive photos should also be deleted. If Google permission has been revoked, files can be deleted directly in Drive. See the <Link href="/privacy">Privacy Policy</Link> for details.</p>
  </section>
  <section><h2>7. Availability and liability</h2>
    <p>Smart Box is evolving; errors, interruptions and feature changes are possible. It depends on internet connectivity, Google, hosting and the database. We do not guarantee uninterrupted operation or suitability for critical record-keeping. Keep separate copies of important information: Smart Box is not a backup of your original photos.</p>
    <p>To the extent permitted by applicable law, the service is provided “as is”, without additional warranties; we are not liable for indirect losses or lost expected profits. This does not exclude liability that cannot lawfully be limited, including intentional wrongdoing, or restrict mandatory consumer rights or personal data protection rights.</p>
  </section>
  <section><h2>8. Access restrictions and service changes</h2>
    <p>We may restrict access in response to abuse, security threats, violations of these terms or legal requirements. Where possible without harming security, we will explain the reason and how to contact us. You may contest a restriction through the contact email.</p>
    <p>If material changes, paid features or closure are planned, we will notify users in the interface or by email in advance where reasonably possible. No automatic charges are intended without separate consent.</p>
  </section>
  <section><h2>9. Privacy, updates and enquiries</h2>
    <p>The <Link href="/privacy">Privacy Policy</Link> describes personal data processing. Reading it does not mean consenting to any future or incompatible processing; we will request separate consent where required by law.</p>
    <p>New versions of these terms are published at this URL with an updated date. We will notify users of material changes before they apply where possible and request renewed acceptance where needed. You may stop using the service if new terms are not acceptable to you.</p>
    <p>Mandatory laws governing your relationship with the service apply. These terms do not remove your right to contact a competent court or data protection authority. You can first email <Contact/> to try to resolve an issue without a dispute.</p>
  </section>
</>;}
