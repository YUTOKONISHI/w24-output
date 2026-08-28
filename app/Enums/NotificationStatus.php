<?php

namespace App\Enums;

enum NotificationStatus: string
{
    case Unread = 'unread';
    case Read = 'read';
}
