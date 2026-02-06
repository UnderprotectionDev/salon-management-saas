# User Flows

> **Last Updated:** 2026-02-04
> **Status:** Active

This document contains visual flow diagrams (Mermaid) for key user journeys in the Salon Management SaaS.

---

## Customer Booking Flow

### Complete Booking Journey

```mermaid
flowchart TB
    Start([Customer visits salon page])
    Browse[Browse Services]
    Select[Select Service(s)]
    Staff{Select Staff?}
    AnyStaff[Any Available]
    SpecificStaff[Choose Specific Staff]
    Date[Select Date]
    Time[Select Time Slot]
    SlotAvailable{Slot Available?}
    Lock[Acquire Slot Lock]
    LockFailed{Lock Failed?}
    Info[Enter Contact Info]
    OTP[Verify Phone OTP]
    OTPValid{OTP Valid?}
    Confirm[Confirm Booking]
    Success([Booking Confirmed])
    Email[Send Confirmation Email]
    Reminder[Schedule Reminder]

    Start --> Browse
    Browse --> Select
    Select --> Staff
    Staff -->|Yes| SpecificStaff
    Staff -->|No| AnyStaff
    SpecificStaff --> Date
    AnyStaff --> Date
    Date --> Time
    Time --> SlotAvailable
    SlotAvailable -->|No| Date
    SlotAvailable -->|Yes| Lock
    Lock --> LockFailed
    LockFailed -->|Yes| Time
    LockFailed -->|No| Info
    Info --> OTP
    OTP --> OTPValid
    OTPValid -->|No, retry| OTP
    OTPValid -->|Yes| Confirm
    Confirm --> Success
    Success --> Email
    Success --> Reminder
```

### Booking Cancellation Flow

```mermaid
flowchart TB
    Start([Customer opens booking link])
    Identify[Identify Booking]
    Found{Booking Found?}
    NotFound([Show Error])
    Status{Booking Status?}
    Completed([Cannot Cancel - Completed])
    AlreadyCancelled([Already Cancelled])
    Cancellable{Within Cancel Window?}
    TooLate([Cannot Cancel - Too Late])
    ShowDetails[Show Booking Details]
    ConfirmCancel{Confirm Cancellation?}
    Back([Return to Details])
    Process[Process Cancellation]
    SendNotification[Send Confirmation Email]
    FreeSlot[Release Time Slot]
    Success([Cancellation Complete])

    Start --> Identify
    Identify --> Found
    Found -->|No| NotFound
    Found -->|Yes| Status
    Status -->|Completed| Completed
    Status -->|Cancelled| AlreadyCancelled
    Status -->|Active| Cancellable
    Cancellable -->|No| TooLate
    Cancellable -->|Yes| ShowDetails
    ShowDetails --> ConfirmCancel
    ConfirmCancel -->|No| Back
    ConfirmCancel -->|Yes| Process
    Process --> SendNotification
    Process --> FreeSlot
    FreeSlot --> Success
```

---

## Staff Daily Operations Flow

### Morning Check-in Flow

```mermaid
flowchart TB
    Start([Staff opens app])
    Login{Logged in?}
    Authenticate[Login with Magic Link]
    Dashboard[View Dashboard]
    Today[View Today's Schedule]
    Appointments{Appointments Today?}
    Empty[No Appointments - Free Day]
    Review[Review First Appointment]
    Prepare[Prepare for Customer]

    Start --> Login
    Login -->|No| Authenticate
    Login -->|Yes| Dashboard
    Authenticate --> Dashboard
    Dashboard --> Today
    Today --> Appointments
    Appointments -->|No| Empty
    Appointments -->|Yes| Review
    Review --> Prepare
```

### Customer Check-in Flow

```mermaid
flowchart TB
    Start([Customer Arrives])
    Find[Find Appointment]
    Search{Search Method}
    ByName[Search by Name]
    ByPhone[Search by Phone]
    ByTime[Browse by Time]
    Found{Appointment Found?}
    Create[Create Walk-in]
    Verify[Verify Customer]
    CheckIn[Check In Customer]
    Notify[Notify Assigned Staff]
    Update[Update Dashboard]
    Ready([Customer Ready])

    Start --> Find
    Find --> Search
    Search --> ByName
    Search --> ByPhone
    Search --> ByTime
    ByName --> Found
    ByPhone --> Found
    ByTime --> Found
    Found -->|No| Create
    Found -->|Yes| Verify
    Create --> Ready
    Verify --> CheckIn
    CheckIn --> Notify
    CheckIn --> Update
    Update --> Ready
```

### Appointment Completion Flow

```mermaid
flowchart TB
    Start([Service Complete])
    Review[Review Services Rendered]
    AddProducts{Products Sold?}
    SelectProducts[Add Products to Bill]
    Calculate[Calculate Total]
    Payment[Process Payment]
    Method{Payment Method}
    Cash[Record Cash Payment]
    Card[Record Card Payment]
    Receipt[Generate Receipt]
    Complete[Mark Appointment Complete]
    UpdateStats[Update Customer Stats]
    Done([Checkout Complete])

    Start --> Review
    Review --> AddProducts
    AddProducts -->|Yes| SelectProducts
    AddProducts -->|No| Calculate
    SelectProducts --> Calculate
    Calculate --> Payment
    Payment --> Method
    Method -->|Cash| Cash
    Method -->|Card| Card
    Cash --> Receipt
    Card --> Receipt
    Receipt --> Complete
    Complete --> UpdateStats
    UpdateStats --> Done
```

---

## Admin Management Flows

### Staff Onboarding Flow

```mermaid
flowchart TB
    Start([Owner decides to add staff])
    OpenInvite[Open Staff Section]
    EnterDetails[Enter Staff Details]
    Details[Name, Email, Role]
    Services[Assign Services]
    Schedule[Set Default Schedule]
    Send[Send Invitation]
    Email[Invitation Email Sent]
    Wait{Staff Accepts?}
    Expired[Invitation Expired]
    Resend{Resend?}
    NewInvite[Send New Invitation]
    Accept[Staff Clicks Link]
    CreateAccount[Creates Account]
    Activate[Account Activated]
    Ready([Staff Ready to Work])

    Start --> OpenInvite
    OpenInvite --> EnterDetails
    EnterDetails --> Details
    Details --> Services
    Services --> Schedule
    Schedule --> Send
    Send --> Email
    Email --> Wait
    Wait -->|Timeout| Expired
    Wait -->|Yes| Accept
    Expired --> Resend
    Resend -->|Yes| NewInvite
    NewInvite --> Email
    Resend -->|No| Start
    Accept --> CreateAccount
    CreateAccount --> Activate
    Activate --> Ready
```

### Service Creation Flow

```mermaid
flowchart TB
    Start([Admin opens Services])
    New[Click Add Service]
    Form[Service Form]
    Basic[Enter Basic Info]
    Name[Service Name]
    Desc[Description]
    Duration[Set Duration]
    Price[Set Price]
    PriceType{Price Type?}
    Fixed[Fixed Price]
    Starting[Starting From]
    Category{Select Category?}
    Existing[Choose Existing]
    NewCat[Create New Category]
    AssignStaff[Assign Staff Members]
    Visibility{Show Online?}
    Public[Available for Online Booking]
    Internal[Staff Booking Only]
    Review[Review Details]
    Save[Save Service]
    Success([Service Created])

    Start --> New
    New --> Form
    Form --> Basic
    Basic --> Name
    Name --> Desc
    Desc --> Duration
    Duration --> Price
    Price --> PriceType
    PriceType --> Fixed
    PriceType --> Starting
    Fixed --> Category
    Starting --> Category
    Category -->|Existing| Existing
    Category -->|New| NewCat
    Existing --> AssignStaff
    NewCat --> AssignStaff
    AssignStaff --> Visibility
    Visibility -->|Yes| Public
    Visibility -->|No| Internal
    Public --> Review
    Internal --> Review
    Review --> Save
    Save --> Success
```

### Schedule Override Flow

```mermaid
flowchart TB
    Start([Admin manages schedule])
    SelectStaff[Select Staff Member]
    ViewSchedule[View Current Schedule]
    Action{Action Type?}

    subgraph Override[Schedule Override]
        OverrideDate[Select Date]
        OverrideType{Override Type?}
        CustomHours[Set Custom Hours]
        DayOff[Mark as Day Off]
        SaveOverride[Save Override]
    end

    subgraph Conflict[Conflict Check]
        CheckAppts{Existing Appointments?}
        NoConflict[Apply Override]
        HasConflict[Show Affected Appointments]
        HandleConflict{Handle Conflicts?}
        Reassign[Reassign to Other Staff]
        Cancel[Cancel Appointments]
        KeepOverride[Proceed with Override]
    end

    Done([Override Applied])

    Start --> SelectStaff
    SelectStaff --> ViewSchedule
    ViewSchedule --> Action
    Action -->|Add Override| OverrideDate
    OverrideDate --> OverrideType
    OverrideType -->|Custom| CustomHours
    OverrideType -->|Day Off| DayOff
    CustomHours --> SaveOverride
    DayOff --> SaveOverride
    SaveOverride --> CheckAppts
    CheckAppts -->|No| NoConflict
    CheckAppts -->|Yes| HasConflict
    NoConflict --> Done
    HasConflict --> HandleConflict
    HandleConflict -->|Reassign| Reassign
    HandleConflict -->|Cancel| Cancel
    HandleConflict -->|Proceed| KeepOverride
    Reassign --> Done
    Cancel --> Done
    KeepOverride --> Done
```

---

## Authentication Flows

### Google OAuth Login (Current)

```mermaid
flowchart TB
    Start([User visits login page])
    ClickGoogle[Click Sign in with Google]
    GoogleConsent[Google Consent Screen]
    Authorize{Authorized?}
    Denied[Show Error - Try Again]
    Callback[OAuth Callback]
    CreateSession[Create/Update Session]
    CheckInvitations{Has Pending Invitations?}
    ShowBanner[Show Invitation Banner]
    HasOrg{Has Organization?}
    Dashboard[Redirect to Dashboard]
    Setup[Redirect to Onboarding]

    Start --> ClickGoogle
    ClickGoogle --> GoogleConsent
    GoogleConsent --> Authorize
    Authorize -->|No| Denied
    Denied --> Start
    Authorize -->|Yes| Callback
    Callback --> CreateSession
    CreateSession --> CheckInvitations
    CheckInvitations -->|Yes| ShowBanner
    CheckInvitations -->|No| HasOrg
    ShowBanner --> HasOrg
    HasOrg -->|Yes| Dashboard
    HasOrg -->|No| Setup
```

### OTP Verification (Booking) — Planned (Sprint 3-4)

> **Note:** OTP verification for booking is not yet implemented. This flow describes the planned behavior.

```mermaid
flowchart TB
    Start([Customer enters phone])
    Validate{Valid Phone?}
    Invalid[Show Format Error]
    CheckLimit{Rate Limited?}
    Limited[Show Wait Message]
    Generate[Generate 6-digit Code]
    Store[Store Hashed Code]
    Send[Send SMS/Email]
    ShowInput[Show OTP Input]
    Enter[User Enters Code]
    Verify{Code Correct?}
    AttemptsLeft{Attempts Left?}
    TooMany[Max Attempts - Restart]
    Wrong[Show Error - Try Again]
    Timeout{Code Expired?}
    Resend[Resend Code]
    Success([Verification Complete])

    Start --> Validate
    Validate -->|No| Invalid
    Invalid --> Start
    Validate -->|Yes| CheckLimit
    CheckLimit -->|Yes| Limited
    CheckLimit -->|No| Generate
    Generate --> Store
    Store --> Send
    Send --> ShowInput
    ShowInput --> Enter
    Enter --> Verify
    Verify -->|No| AttemptsLeft
    AttemptsLeft -->|No| TooMany
    AttemptsLeft -->|Yes| Wrong
    TooMany --> Start
    Wrong --> Timeout
    Timeout -->|Yes| Resend
    Timeout -->|No| ShowInput
    Resend --> Generate
    Verify -->|Yes| Success
```

---

## Hybrid Account Flows

### Guest to Account Holder Journey

This flow shows how customers transition from anonymous guests to registered account holders.

```mermaid
stateDiagram-v2
    [*] --> Anonymous: First visit

    state Anonymous {
        [*] --> GuestBooking
        GuestBooking --> PhoneVerified: OTP verified
        PhoneVerified --> CustomerCreated: Record created
    }

    Anonymous --> Returning: 2nd booking

    state Returning {
        [*] --> PhoneLookup
        PhoneLookup --> RecordFound: Match found
        RecordFound --> PrefilledForm: Auto-fill info
    }

    Returning --> Prompt: 3rd booking

    state Prompt {
        [*] --> ShowAccountBanner
        ShowAccountBanner --> UserDecides
        UserDecides --> SkipForNow: Not now
        UserDecides --> CreateAccount: Yes, create
    }

    Prompt --> Registered: Account created

    state Registered {
        [*] --> LoggedIn
        LoggedIn --> ViewHistory: My bookings
        LoggedIn --> ManageProfile: Settings
        LoggedIn --> QuickBook: Fast booking
    }

    SkipForNow --> Prompt: Next visit
```

### Account Creation During Booking

```mermaid
flowchart TB
    Start([Customer on 3rd+ booking])
    ShowBanner["🎉 Create an account for faster booking!"]
    Decision{User response}

    subgraph CreateFlow[Account Creation]
        EnterEmail[Enter email address]
        SendMagicLink[Send magic link]
        CheckEmail[User checks email]
        ClickLink[Click magic link]
        LinkAccount[Link to existing customer record]
        MergeData[Merge booking history]
        Success([Account created!])
    end

    subgraph SkipFlow[Continue as Guest]
        ContinueBooking[Continue with booking]
        RemindLater[Remind on next visit]
    end

    Start --> ShowBanner
    ShowBanner --> Decision
    Decision -->|Create account| EnterEmail
    Decision -->|Not now| ContinueBooking

    EnterEmail --> SendMagicLink
    SendMagicLink --> CheckEmail
    CheckEmail --> ClickLink
    ClickLink --> LinkAccount
    LinkAccount --> MergeData
    MergeData --> Success

    ContinueBooking --> RemindLater
```

---

## Walk-in Quick Booking Flow

### Fast Walk-in Entry

Optimized for speed when customer walks in without appointment.

```mermaid
flowchart TB
    Start([Customer walks in])
    OpenQuickForm[Click "Walk-in" button]

    subgraph QuickForm[Minimal Form - 30 seconds]
        Name[Enter customer name]
        Phone[Enter phone number]
        SelectService[Select service(s)]
        Staff{Assign staff?}
        AnyAvailable[Any available - auto]
        SpecificStaff[Choose staff]
        TimeSlot[Start time: NOW or next slot]
    end

    CreateBooking[Create appointment]
    Status[Status: checked_in]
    NotifyStaff[Notify assigned staff]
    Done([Walk-in registered])

    Start --> OpenQuickForm
    OpenQuickForm --> Name
    Name --> Phone
    Phone --> SelectService
    SelectService --> Staff
    Staff -->|No preference| AnyAvailable
    Staff -->|Specific| SpecificStaff
    AnyAvailable --> TimeSlot
    SpecificStaff --> TimeSlot
    TimeSlot --> CreateBooking
    CreateBooking --> Status
    Status --> NotifyStaff
    NotifyStaff --> Done

    style QuickForm fill:#e8f5e9
```

### Walk-in vs Online Booking Comparison

```mermaid
flowchart LR
    subgraph Online[Online Booking - 3-5 min]
        O1[Select service] --> O2[Select staff]
        O2 --> O3[Select date]
        O3 --> O4[Select time]
        O4 --> O5[Enter contact info]
        O5 --> O6[OTP verification]
        O6 --> O7[Confirm]
    end

    subgraph WalkIn[Walk-in Booking - 30 sec]
        W1[Name + Phone] --> W2[Select service]
        W2 --> W3[Confirm]
    end

    style WalkIn fill:#c8e6c9
```

---

## Time-Off Request & Approval Flow

### Staff Time-Off Request

```mermaid
flowchart TB
    Start([Staff opens schedule])
    RequestButton[Click "Request Time Off"]

    subgraph RequestForm[Time-Off Request Form]
        DateRange[Select date range]
        Type[Select type]
        TypeOptions["• Vacation
        • Sick Leave
        • Personal
        • Other"]
        Reason[Add note - optional]
    end

    CheckConflicts{Appointments in range?}
    ShowWarning["⚠️ You have 3 appointments"]
    Acknowledge[Staff acknowledges]
    Submit[Submit request]
    Pending[Status: Pending]
    Notify[Notify Admin/Owner]
    Wait([Awaiting approval])

    Start --> RequestButton
    RequestButton --> DateRange
    DateRange --> Type
    Type --> TypeOptions
    TypeOptions --> Reason
    Reason --> CheckConflicts
    CheckConflicts -->|Yes| ShowWarning
    CheckConflicts -->|No| Submit
    ShowWarning --> Acknowledge
    Acknowledge --> Submit
    Submit --> Pending
    Pending --> Notify
    Notify --> Wait
```

### Admin Time-Off Approval

```mermaid
flowchart TB
    Start([Admin sees notification])
    ViewRequest[View time-off request]

    subgraph Details[Request Details]
        Staff[Staff: Ayşe]
        Dates["Dates: Feb 15-17"]
        Type[Type: Vacation]
        Note[Note: Family event]
    end

    CheckAppts{Appointments affected?}

    subgraph NoConflict[No Conflicts]
        DirectApprove[One-click approve]
    end

    subgraph HasConflict[Has Conflicts]
        ShowAffected["⚠️ 5 appointments affected"]
        Options{Choose action}
        Reassign[Reassign to other staff]
        Cancel[Cancel appointments]
        Reject[Reject request]
    end

    ProcessReassign[Auto-reassign appointments]
    ProcessCancel[Cancel and notify customers]
    WriteRejection[Add rejection reason]

    Approve[Approve time-off]
    Denied[Reject time-off]
    NotifyStaff[Notify staff of decision]
    UpdateSchedule[Update schedule]
    Done([Complete])

    Start --> ViewRequest
    ViewRequest --> Details
    Details --> CheckAppts
    CheckAppts -->|No| DirectApprove
    CheckAppts -->|Yes| ShowAffected

    DirectApprove --> Approve

    ShowAffected --> Options
    Options --> Reassign
    Options --> Cancel
    Options --> Reject

    Reassign --> ProcessReassign
    ProcessReassign --> Approve

    Cancel --> ProcessCancel
    ProcessCancel --> Approve

    Reject --> WriteRejection
    WriteRejection --> Denied

    Approve --> NotifyStaff
    Denied --> NotifyStaff
    NotifyStaff --> UpdateSchedule
    UpdateSchedule --> Done

    style HasConflict fill:#fff3e0
```

### Time-Off States

```mermaid
stateDiagram-v2
    [*] --> Pending: Request submitted
    Pending --> Approved: Admin approves
    Pending --> Rejected: Admin rejects
    Approved --> Active: Start date reached
    Active --> Completed: End date passed
    Rejected --> [*]: Staff notified

    note right of Pending: Can be withdrawn by staff
    note right of Approved: Schedule blocked
```

---

## System Flows

### Real-Time Slot Update

```mermaid
sequenceDiagram
    participant C1 as Customer A
    participant C2 as Customer B
    participant App as Next.js App
    participant Convex as Convex Backend

    Note over C1,C2: Both viewing same time slot

    C1->>App: Select 14:00 slot
    App->>Convex: acquireSlotLock(14:00)
    Convex->>Convex: Create lock (2min TTL)
    Convex-->>App: Lock acquired
    Convex-->>App: Subscription update
    App-->>C2: Slot shows "Being booked"

    C2->>App: Try to select 14:00
    App-->>C2: Slot unavailable

    C1->>App: Complete booking
    App->>Convex: createAppointment()
    Convex->>Convex: Create appointment
    Convex->>Convex: Delete lock
    Convex-->>App: Subscription update
    App-->>C2: Slot shows as booked
```

### Notification Flow

```mermaid
flowchart TB
    subgraph Triggers
        NewBooking[New Online Booking]
        Cancellation[Booking Cancelled]
        TimeOff[Time-off Request]
        LowStock[Low Stock Alert]
    end

    subgraph Process
        Detect[Event Detected]
        Create[Create Notification]
        Store[Store in Database]
        Broadcast[Broadcast to Subscribers]
    end

    subgraph Delivery
        Dashboard[Dashboard Widget]
        Email[Email Notification]
        Push[Push Notification - Future]
    end

    NewBooking --> Detect
    Cancellation --> Detect
    TimeOff --> Detect
    LowStock --> Detect

    Detect --> Create
    Create --> Store
    Store --> Broadcast

    Broadcast --> Dashboard
    Broadcast --> Email
    Broadcast -.-> Push
```

---

## Error Recovery Flows

### Lock Expiration Recovery

```mermaid
flowchart TB
    Start([User filling form])
    Timer{Lock expires in 30s}
    Warning[Show warning toast]
    Continue{User continues?}
    Extend[Attempt to extend lock]
    ExtendOK{Extension succeeded?}
    Proceed[Continue booking]
    Lost[Lock lost]
    Retry{Slot still free?}
    Reacquire[Acquire new lock]
    Unavailable[Show slot unavailable]
    SelectNew[Select different slot]

    Start --> Timer
    Timer -->|Warning| Warning
    Warning --> Continue
    Continue -->|Yes, submit| Extend
    Continue -->|Slow| Lost
    Extend --> ExtendOK
    ExtendOK -->|Yes| Proceed
    ExtendOK -->|No| Lost
    Lost --> Retry
    Retry -->|Yes| Reacquire
    Retry -->|No| Unavailable
    Reacquire --> Proceed
    Unavailable --> SelectNew
```

### Network Error Recovery

```mermaid
flowchart TB
    Start([User action])
    Send[Send request]
    Response{Response?}
    Success[Handle success]
    Timeout[Request timeout]
    Retry{Auto retry?}
    AutoRetry[Retry with backoff]
    ShowError[Show error message]
    UserRetry{User clicks retry?}
    Abandon[User abandons]
    Manual[Manual retry]

    Start --> Send
    Send --> Response
    Response -->|Success| Success
    Response -->|Timeout| Timeout
    Timeout --> Retry
    Retry -->|Yes, attempt < 3| AutoRetry
    AutoRetry --> Send
    Retry -->|No| ShowError
    ShowError --> UserRetry
    UserRetry -->|Yes| Manual
    UserRetry -->|No| Abandon
    Manual --> Send
```

---

## Subscription Flows

### Subscription Checkout Flow

```mermaid
flowchart TB
    Start([Owner opens billing page])
    ViewPlans[View subscription plans]
    SelectPlan{Select billing period}
    Monthly[Monthly ₺500/mo]
    Yearly[Yearly ₺5,100/yr<br/>15% savings]

    CreateCheckout[Create Polar checkout session]
    Redirect[Redirect to Polar checkout]

    subgraph Polar["Polar Checkout"]
        EnterCard[Enter payment details]
        Processing[Process payment]
        Success{Payment successful?}
    end

    Webhook[Receive webhook: checkout.completed]
    ActivateOrg[Activate organization]
    SendConfirmation[Send confirmation email]
    ShowSuccess[Show success message]
    Dashboard([Return to dashboard])

    Failed[Payment failed]
    Retry{Try again?}
    Abandon([Abandon checkout])

    Start --> ViewPlans
    ViewPlans --> SelectPlan
    SelectPlan -->|Monthly| Monthly
    SelectPlan -->|Yearly| Yearly
    Monthly --> CreateCheckout
    Yearly --> CreateCheckout
    CreateCheckout --> Redirect
    Redirect --> EnterCard
    EnterCard --> Processing
    Processing --> Success
    Success -->|Yes| Webhook
    Success -->|No| Failed
    Webhook --> ActivateOrg
    ActivateOrg --> SendConfirmation
    SendConfirmation --> ShowSuccess
    ShowSuccess --> Dashboard
    Failed --> Retry
    Retry -->|Yes| EnterCard
    Retry -->|No| Abandon

    style Polar fill:#e3f2fd
```

### Failed Payment Recovery Flow

```mermaid
flowchart TB
    Start([Payment fails])
    SetPastDue[Set status: past_due]
    StartGrace[Start 7-day grace period]
    SendEmail1[Day 0: Send failure email]

    subgraph GracePeriod["Grace Period - 7 Days"]
        Day1[Day 1: Full access continues]
        Day3[Day 3: Reminder email]
        Day5[Day 5: Warning email]
        Day7[Day 7: Final notice email]
    end

    UpdatePayment{Owner updates payment?}
    RetryPayment[Retry payment via Polar]
    PaymentSuccess{Payment successful?}
    ClearGrace[Clear grace period]
    Reactivate[Set status: active]
    Recovered([Recovery successful])

    GraceExpires[Grace period expires]
    Suspend[Set status: suspended]
    LockAccess[Lock all access except billing]
    SendSuspendEmail[Send suspension email]
    Suspended([Account suspended])

    LaterUpdate{Owner updates payment?}
    RetryLater[Process payment]
    LaterSuccess{Payment successful?}
    Reactivated([Account reactivated])

    Start --> SetPastDue
    SetPastDue --> StartGrace
    StartGrace --> SendEmail1
    SendEmail1 --> Day1
    Day1 --> Day3
    Day3 --> Day5
    Day5 --> Day7

    UpdatePayment -->|Yes, during grace| RetryPayment
    RetryPayment --> PaymentSuccess
    PaymentSuccess -->|Yes| ClearGrace
    ClearGrace --> Reactivate
    Reactivate --> Recovered

    Day7 --> GraceExpires
    GraceExpires --> Suspend
    Suspend --> LockAccess
    LockAccess --> SendSuspendEmail
    SendSuspendEmail --> Suspended

    Suspended --> LaterUpdate
    LaterUpdate -->|Yes| RetryLater
    RetryLater --> LaterSuccess
    LaterSuccess -->|Yes| Reactivated
    LaterSuccess -->|No| Suspended

    style GracePeriod fill:#fff3e0
```

### Subscription Cancellation Flow

```mermaid
flowchart TB
    Start([Owner clicks cancel])
    ConfirmPrompt[Show confirmation dialog]

    subgraph Dialog["Cancellation Dialog"]
        Warning["⚠️ Are you sure?<br/>Your access will end on [date]"]
        Benefits[Show what they'll lose]
        Reason[Optional: Select reason]
        Confirm{Confirm cancellation?}
    end

    Cancel[Cancel subscription]
    SetCancelAtEnd[Set cancelAtPeriodEnd = true]
    SendConfirmEmail[Send cancellation confirmation]
    ShowEndDate[Show when access ends]

    ContinueAccess[Access continues until period end]
    AccessEnds[Access ends]
    DataRetention[Data retained 30 days]
    DataDeleted[Data deleted]

    KeepSubscription([Keep subscription])
    Cancelled([Subscription cancelled])

    Resubscribe{Owner resubscribes?}
    NewCheckout[Start new checkout]
    Reactivated([Subscription reactivated])

    Start --> ConfirmPrompt
    ConfirmPrompt --> Warning
    Warning --> Benefits
    Benefits --> Reason
    Reason --> Confirm
    Confirm -->|No| KeepSubscription
    Confirm -->|Yes| Cancel
    Cancel --> SetCancelAtEnd
    SetCancelAtEnd --> SendConfirmEmail
    SendConfirmEmail --> ShowEndDate
    ShowEndDate --> Cancelled

    Cancelled --> ContinueAccess
    ContinueAccess --> AccessEnds
    AccessEnds --> DataRetention
    DataRetention --> DataDeleted

    AccessEnds --> Resubscribe
    Resubscribe -->|Yes| NewCheckout
    NewCheckout --> Reactivated
```

### Subscription Status States

```mermaid
stateDiagram-v2
    [*] --> NoSubscription: New organization

    NoSubscription --> Active: Complete checkout
    Active --> PastDue: Payment fails
    PastDue --> Active: Payment succeeds
    PastDue --> Suspended: Grace period expires (7 days)
    Suspended --> Active: Payment succeeds
    Active --> Cancelled: Owner cancels
    Cancelled --> Active: Owner resubscribes

    Suspended --> Deleted: 30 days no action
    Cancelled --> Deleted: 30 days after period ends

    note right of Active: Full platform access
    note right of PastDue: Full access, warning banners
    note right of Suspended: Billing page only
    note right of Cancelled: Access until period end
```

### Billing Page User Flow

```mermaid
flowchart TB
    Start([Owner opens billing])
    ViewStatus[View subscription status]

    subgraph StatusView["Current Status"]
        Plan[Current plan & billing period]
        NextBilling[Next billing date & amount]
        PaymentMethod[Payment method on file]
    end

    subgraph Actions["Available Actions"]
        ManagePortal[Manage via Polar Portal]
        ChangePlan[Change billing period]
        CancelSub[Cancel subscription]
        ViewHistory[View billing history]
    end

    ManagePortal --> PolarPortal[Open Polar customer portal]
    ChangePlan --> UpgradeFlow[Monthly ↔ Yearly]
    CancelSub --> CancelFlow[Cancellation flow]
    ViewHistory --> HistoryTable[Show past payments]

    DownloadInvoice[Download invoice PDF]
    HistoryTable --> DownloadInvoice

    Start --> ViewStatus
    ViewStatus --> StatusView
    StatusView --> Actions

    style Actions fill:#e8f5e9
```
