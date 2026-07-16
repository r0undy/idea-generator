# Requirements Document

## Introduction

The Gacha Idea Generator is a full-stack, mobile-first web application that delivers
random project ideas through a gacha-style pull mechanic. Authenticated users tap a
3D chest that emits a color indicating the rarity of the reward before opening:
silver for common, purple for rare, and gold for super rare. Users may perform a
single pull (1x) or a batch pull (10x). Ideas are drawn from a curated, pre-seeded
catalog stored in Postgres. Drop rates, pity behavior, and batch guarantees are
enforced server-side and are tunable without a client redeploy. Per-user pull history
and pity progress persist across devices under Row Level Security.

## Glossary

- **System**: The Gacha Idea Generator application, including its Next.js frontend and
  Supabase-backed server-side logic.
- **Pull_Service**: The server-side component (Route Handler or Server Action) that
  authorizes a request, applies drop rates and pity rules, selects ideas, and persists
  results.
- **User**: An authenticated person who performs pulls and views their history.
- **Project_Idea**: A curated catalog row containing idea content and an assigned
  Rarity_Tier, stored in the `project_ideas` table.
- **Rarity_Tier**: One of three tiers assigned to each Project_Idea: `common`,
  `rare`, or `super_rare`.
- **Rarity_Color**: The visual color mapped to a Rarity_Tier: silver for `common`,
  purple for `rare`, gold for `super_rare`.
- **Single_Pull**: A request that draws one Project_Idea.
- **Batch_Pull**: A request that draws ten Project_Ideas in one operation.
- **Pity_Counter**: A per-user integer tracking the number of consecutive pulls since
  the last `super_rare` result was awarded.
- **Pity_Threshold**: The pull count (90) at which a `super_rare` Project_Idea is
  guaranteed.
- **Drop_Rate_Config**: The server-side configuration defining the probability of each
  Rarity_Tier, editable without a client redeploy.
- **Pull_History**: The per-user, RLS-protected record of awarded Project_Ideas and
  their metadata over time.
- **Chest_Animation**: The 3D chest interaction that emits a Rarity_Color and opens to
  reveal a result.
- **Reduced_Motion_Mode**: A simplified, non-animated presentation used when the user's
  device signals a reduced-motion preference.

## Requirements

### Requirement 1

**User Story:** As a User, I want to sign in before pulling, so that my history and pity
progress are tied to my account and persist across devices.

#### Acceptance Criteria

1. IF an unauthenticated visitor requests a pull, THEN THE Pull_Service SHALL reject the
   request and return an authentication-required response.
2. WHEN a User authenticates through Supabase Auth, THE System SHALL associate all
   subsequent pulls and Pity_Counter updates with that User's account identifier.
3. WHEN an authenticated User signs in on a different device, THE System SHALL load the
   same Pull_History and Pity_Counter values stored for that User's account.
4. THE System SHALL enforce Row Level Security so that each User can read and write only
   their own Pull_History and Pity_Counter records.

### Requirement 2

**User Story:** As a User, I want to tap a 3D chest and perform a single pull, so that I
receive one random project idea.

#### Acceptance Criteria

1. WHEN an authenticated User initiates a Single_Pull, THE Pull_Service SHALL select one
   Project_Idea according to the Drop_Rate_Config and pity rules.
2. WHEN a Single_Pull result is determined, THE System SHALL display the Rarity_Color
   corresponding to the awarded Rarity_Tier before revealing the Project_Idea content.
3. WHEN a Single_Pull completes, THE Pull_Service SHALL record the awarded Project_Idea
   and its Rarity_Tier in the User's Pull_History.
4. WHEN a Single_Pull completes, THE Pull_Service SHALL update the User's Pity_Counter
   according to the pity rules.

### Requirement 3

**User Story:** As a User, I want to perform a 10x batch pull, so that I can receive ten
ideas at once with a guaranteed minimum rarity.

#### Acceptance Criteria

1. WHEN an authenticated User initiates a Batch_Pull, THE Pull_Service SHALL select ten
   Project_Ideas according to the Drop_Rate_Config and pity rules.
2. THE Pull_Service SHALL guarantee that each Batch_Pull result contains at least one
   Project_Idea of Rarity_Tier `rare` or higher.
3. WHEN a Batch_Pull completes, THE Pull_Service SHALL record all ten awarded
   Project_Ideas and their Rarity_Tiers in the User's Pull_History.
4. WHEN a Batch_Pull completes, THE Pull_Service SHALL update the User's Pity_Counter
   for each of the ten pulls in sequence according to the pity rules.

### Requirement 4

**User Story:** As a User, I want a pity guarantee, so that a super rare idea is
guaranteed after a defined number of pulls without one.

#### Acceptance Criteria

1. THE Pull_Service SHALL increment the User's Pity_Counter by one for each individual
   pull that does not award a `super_rare` Project_Idea.
2. WHEN the User's Pity_Counter reaches the Pity_Threshold of 90 on a pull, THE
   Pull_Service SHALL award a `super_rare` Project_Idea for that pull.
3. WHEN a pull awards a `super_rare` Project_Idea, THE Pull_Service SHALL reset the
   User's Pity_Counter to zero.
4. WHILE a Batch_Pull is being resolved, THE Pull_Service SHALL evaluate the
   Pity_Threshold against each of the ten pulls individually.

### Requirement 5

**User Story:** As an operator, I want drop rates and pity behavior enforced and
configured on the server, so that odds stay authoritative and tunable without redeploying
the client.

#### Acceptance Criteria

1. THE Pull_Service SHALL determine every Rarity_Tier outcome on the server using the
   Drop_Rate_Config and pity rules.
2. THE System SHALL store the Drop_Rate_Config server-side so that its values can change
   without a client redeploy.
3. THE Drop_Rate_Config SHALL define default probabilities of 79 percent for `common`,
   18 percent for `rare`, and 3 percent for `super_rare` for a pull that is not
   overridden by a pity or batch guarantee.
4. IF the Drop_Rate_Config probabilities for a pull do not sum to 100 percent, THEN THE
   Pull_Service SHALL reject the pull and return a configuration-error response.
5. THE System SHALL NOT expose the Supabase service-role key or Drop_Rate_Config
   internals to the client.

### Requirement 6

**User Story:** As a User, I want to review my past pulls, so that I can see which ideas
and rarities I have received.

#### Acceptance Criteria

1. WHEN an authenticated User opens the history view, THE System SHALL display the User's
   awarded Project_Ideas together with each result's Rarity_Tier and pull timestamp.
2. THE System SHALL order the displayed Pull_History from most recent to least recent.
3. WHERE the User has no recorded pulls, THE System SHALL display an empty-history state.

### Requirement 7

**User Story:** As a User on a small touch screen, I want a mobile-first experience with
an accessible chest animation, so that the app is usable and comfortable on my device.

#### Acceptance Criteria

1. THE System SHALL render the pull interface for narrow mobile viewports first and
   enhance the layout for larger viewports.
2. THE System SHALL provide interactive tap targets of at least 44 pixels in both width
   and height for the pull controls.
3. WHERE the User's device signals a reduced-motion preference, THE System SHALL present
   the pull result using Reduced_Motion_Mode in place of the animated Chest_Animation.
4. WHEN a pull is in progress, THE System SHALL indicate the in-progress state and
   prevent the User from initiating an overlapping pull request.

### Requirement 8

**User Story:** As a User, I want the app to handle errors gracefully, so that a failed
pull does not corrupt my history or pity progress.

#### Acceptance Criteria

1. IF a pull operation fails before results are persisted, THEN THE Pull_Service SHALL
   leave the User's Pity_Counter and Pull_History unchanged.
2. IF a pull request fails, THEN THE System SHALL display an error state and allow the
   User to retry the pull.
3. IF the `project_ideas` catalog contains no Project_Idea for a required Rarity_Tier,
   THEN THE Pull_Service SHALL reject the pull and return a catalog-error response.
