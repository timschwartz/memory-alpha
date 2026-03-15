# Feature Specification: Database Download Management

**Feature Branch**: `006-database-download-mgmt`  
**Created**: 2026-03-15  
**Status**: Draft  
**Input**: User description: "Add a section to the Settings page called 'Database'. There should be a button that will download https://s3.amazonaws.com/wikia_xml_dumps/e/en/enmemoryalpha_pages_current.xml.7z to /data when clicked. After downloading, it should decompress the file. Include a progress indicator. There should be a list of XML files in /data, with the option to redownload enmemoryalpha_pages_current.xml. If the file is less than a week old, it should suggest that an update may not be necessary."

## Clarifications

### Session 2026-03-15

- Q: What should happen to the .7z archive after successful decompression? → A: Delete it automatically
- Q: Should the system auto-trigger import after download, or keep it separate? → A: Separate manual steps, but include an import button next to each file in the file list table
- Q: Should the file list display file sizes alongside filenames? → A: Yes, show file size
- Q: Should the user be able to cancel an in-progress download/decompression? → A: Yes, provide a cancel button that aborts and cleans up partial files
- Q: How should the server communicate real-time progress to the browser? → A: Server-Sent Events (SSE); also migrate existing indexing progress from polling to SSE for consistency

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Download Memory Alpha XML Dump (Priority: P1)

A user visits the Settings page and sees a "Database" section. They click a "Download" button to fetch the latest Memory Alpha XML dump. The system downloads the compressed archive, shows real-time progress during the download and decompression phases, and ultimately places the decompressed XML file in the data directory. The user can see when the operation completes successfully.

**Why this priority**: This is the core capability of the feature — without download functionality, nothing else in this section has value. Users need to be able to acquire the database dump before they can do anything else.

**Independent Test**: Can be fully tested by clicking the download button and verifying the XML file appears in the data directory with a progress indicator shown throughout.

**Acceptance Scenarios**:

1. **Given** the user is on the Settings page, **When** they click the "Download" button in the Database section, **Then** the system begins downloading the compressed XML dump and displays a progress indicator showing the current phase (downloading/decompressing).
2. **Given** a download is in progress, **When** the download completes, **Then** the system automatically decompresses the archive and updates the progress indicator to reflect the decompression phase.
3. **Given** decompression is in progress, **When** decompression completes, **Then** the decompressed XML file is available in the data directory and the progress indicator shows completion.
4. **Given** a download or decompression is in progress, **When** the user views the Database section, **Then** the download button is disabled to prevent concurrent operations and a cancel button is displayed.
5. **Given** a download or decompression is in progress, **When** the user clicks the cancel button, **Then** the operation is aborted, partial files are cleaned up, and the UI returns to the idle state.

---

### User Story 2 - View Available XML Files (Priority: P2)

A user visits the Settings page and sees a list of all XML files currently present in the data directory. Each file entry shows the filename and when it was last modified, so the user knows what data is available and how fresh it is.

**Why this priority**: Knowing what files exist and their age is essential context for deciding whether to download or re-download. This delivers value independently by providing visibility into the data directory state.

**Independent Test**: Can be fully tested by placing XML files in the data directory and verifying they appear in the list with accurate modification dates.

**Acceptance Scenarios**:

1. **Given** the user is on the Settings page and XML files exist in the data directory, **When** the Database section loads, **Then** a list of all XML files is displayed with their filenames, file sizes, last-modified dates, and an import button for each file.
2. **Given** no XML files exist in the data directory, **When** the Database section loads, **Then** a message indicates no XML files are available and prompts the user to download one.
3. **Given** the file list is displayed, **When** a file is downloaded or deleted, **Then** the list refreshes to reflect the current state of the data directory.
4. **Given** the file list is displayed, **When** the user clicks the import button next to a file, **Then** the system triggers the import pipeline for that specific XML file.

---

### User Story 3 - Re-download with Freshness Check (Priority: P3)

A user who already has the Memory Alpha XML file can choose to re-download it to get the latest version. If the existing file is less than 7 days old, the system displays a notice suggesting that an update may not be necessary, since wiki dumps are not updated continuously. The user can still proceed with the re-download if they choose.

**Why this priority**: This is an enhancement on top of the download capability. It prevents unnecessary downloads while still giving the user full control, reducing bandwidth waste and wait time.

**Independent Test**: Can be fully tested by having an existing XML file of known age and verifying the freshness notice appears or does not appear based on the file's modification date.

**Acceptance Scenarios**:

1. **Given** the Memory Alpha XML file exists and was modified less than 7 days ago, **When** the user views the Database section, **Then** a notice is displayed suggesting that an update may not be necessary, along with the file's age.
2. **Given** the Memory Alpha XML file exists and was modified 7 or more days ago, **When** the user views the Database section, **Then** no freshness notice is displayed and the re-download option is shown without warning.
3. **Given** the freshness notice is displayed, **When** the user clicks the re-download button, **Then** the system proceeds with the download normally (the notice is advisory, not blocking).
4. **Given** a re-download completes, **When** the file list refreshes, **Then** the file's last-modified date reflects the new download time.

---

### User Story 4 - Handle Download Errors Gracefully (Priority: P3)

A user initiates a download but something goes wrong — network failure, insufficient disk space, or corrupted archive. The system displays a clear error message explaining what happened and allows the user to retry. Any partially downloaded or decompressed files are cleaned up.

**Why this priority**: Error resilience is important for user confidence but is not core functionality. Users need to understand failures and recover from them without manual intervention.

**Independent Test**: Can be tested by simulating network interruption during download and verifying the error message appears and partial files are removed.

**Acceptance Scenarios**:

1. **Given** a download is in progress, **When** the network connection fails, **Then** the system displays an error message describing the failure and offers a retry option.
2. **Given** a download has failed, **When** the user clicks retry, **Then** the download starts again from the beginning.
3. **Given** decompression fails due to a corrupted archive, **When** the error is detected, **Then** the system displays a clear error message and cleans up any partial files.

---

### Edge Cases

- What happens when the user navigates away from the Settings page during an active download? The download should continue in the background on the server side, and returning to the page should show current progress.
- What happens when disk space is insufficient to store the decompressed file? The system should detect the failure during decompression and report a clear error.
- What happens when the remote file URL is unreachable or returns a non-200 response? The system should report the HTTP error and allow retry.
- What happens when the 7z archive contains unexpected files or directory structures? The system should only extract expected XML files and ignore others.
- What happens when multiple users (or tabs) attempt to trigger a download simultaneously? The system should prevent concurrent downloads and indicate that a download is already in progress.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Settings page MUST display a "Database" section with a distinct visual card, consistent with existing Settings page sections (Appearance, Indexing).
- **FR-002**: The Database section MUST include a button to download the Memory Alpha XML dump from the known source URL (`https://s3.amazonaws.com/wikia_xml_dumps/e/en/enmemoryalpha_pages_current.xml.7z`).
- **FR-003**: The system MUST download the compressed archive to the server's data directory.
- **FR-004**: After downloading, the system MUST automatically decompress the 7z archive to produce the XML file in the data directory and then delete the compressed archive file.
- **FR-005**: The system MUST display a progress indicator during both the download and decompression phases, clearly labeling which phase is active.
- **FR-006**: The Database section MUST display a list of all XML files present in the data directory, showing each file's name, file size (human-readable, e.g., "742 MB"), last-modified date, and an import action button.
- **FR-007**: The system MUST provide a re-download option for the Memory Alpha XML file when it already exists.
- **FR-008**: When the Memory Alpha XML file is less than 7 days old, the system MUST display a notice suggesting that an update may not be necessary, including the file's age (e.g., "Last updated 3 days ago — an update may not be necessary").
- **FR-009**: The freshness notice MUST be advisory only — the user MUST still be able to proceed with a re-download.
- **FR-010**: The system MUST disable the download/re-download button while a download or decompression operation is in progress.
- **FR-011**: The system MUST display clear error messages when download or decompression fails, and offer a retry option.
- **FR-012**: The system MUST clean up partial or corrupted files (including the compressed archive) when a download or decompression fails.
- **FR-013**: The system MUST prevent concurrent download operations.
- **FR-014**: When the user clicks the import button next to an XML file, the system MUST trigger the existing import pipeline (mw-import) for that specific file. Download and import remain independent operations.
- **FR-015**: The system MUST provide a cancel button during an active download or decompression operation. Cancellation MUST abort the operation and clean up any partial or temporary files.
- **FR-016**: The system MUST use Server-Sent Events (SSE) to push real-time download and decompression progress updates to the client, rather than client-side polling.
- **FR-017**: The existing indexing progress communication MUST be migrated from polling to SSE for consistency with the download progress mechanism.

### Key Entities

- **XML Data File**: A file in the data directory with an `.xml` extension. Key attributes: filename, file size, last-modified date, whether it is the known Memory Alpha dump file.
- **Download Operation**: A server-side process that fetches a remote archive and decompresses it. Key attributes: current phase (downloading/decompressing/complete/failed), progress percentage (for download phase), error message (if failed).

## Assumptions

- The download URL (`https://s3.amazonaws.com/wikia_xml_dumps/e/en/enmemoryalpha_pages_current.xml.7z`) is a stable, publicly accessible endpoint that does not require authentication.
- The compressed archive is in 7z format and contains the XML file `enmemoryalpha_pages_current.xml`.
- The data directory is a known, fixed location on the server (`/data` relative to the project root).
- The server has a 7z decompression capability available (either a system utility or a library).
- File freshness is determined by the file's local last-modified timestamp, not by querying the remote server for update dates.
- The download is performed server-side (not in the browser), since the file needs to be stored on the server's filesystem.
- Progress for the download phase can be determined from HTTP content-length headers; decompression progress may be indeterminate (shown as a spinner or activity indicator rather than a percentage).
- The existing indexing section currently uses 2-second polling intervals to check status; this will be migrated to SSE as part of this feature for a unified progress communication pattern.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can download and decompress the Memory Alpha XML dump from the Settings page in a single click, with the complete file available in the data directory upon completion.
- **SC-002**: Users see real-time progress feedback throughout the entire download and decompression process, with no period longer than 5 seconds without a visible status update.
- **SC-003**: Users can view all XML files in the data directory with accurate file metadata (name, last-modified date) displayed within 2 seconds of loading the Settings page.
- **SC-004**: Users with a file less than 7 days old see a clear freshness notice before re-downloading, reducing unnecessary re-downloads.
- **SC-005**: When errors occur during download or decompression, users see a descriptive error message within 5 seconds of the failure, with a clear path to retry.
- **SC-006**: No partial or corrupted files remain in the data directory after a failed operation.
