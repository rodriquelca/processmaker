<?php
/**
 * calendarList.php
 *
 * ProcessMaker Open Source Edition
 * Copyright (C) 2004 - 2008 Colosa Inc.23
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * For more information, contact Colosa Inc, 2566 Le Jeune Rd.,
 * Coral Gables, FL, 33134, USA, or email info@colosa.com.
 *
 */

if($RBAC->userCanAccess('PM_SETUP') != 1 && $RBAC->userCanAccess('PM_SETUP_ADVANCE') != 1){	
  G::SendTemporalMessage('ID_USER_HAVENT_RIGHTS_PAGE', 'error', 'labels');
  //G::header('location: ../login/login');
  die;
}

if(class_exists('pmLicenseManager')){
    	$pmLicenseManagerO =& pmLicenseManager::getSingleton();
    	$expireIn=$pmLicenseManagerO->getExpireIn();
    	if($expireIn<=0){
				G::header("location: calendarEdit?id=00000000000000000000000000000001");
			}
		}else{
			G::header("location: calendarEdit?id=00000000000000000000000000000001");
		}
$G_MAIN_MENU = 'processmaker';
$G_SUB_MENU = 'setup';
$G_ID_MENU_SELECTED = 'SETUP';
$G_ID_SUB_MENU_SELECTED = 'CALENDAR';

$dbc = new DBConnection ( );
$G_PUBLISH = new Publisher ( );

G::LoadClass ( "calendar" );
$Calendar = new Calendar ( );
$Criteria = $Calendar->getCalendarList ();//List all calendars (ACTIVE and INACTIVE)

$G_PUBLISH->AddContent ( 'propeltable', 'paged-table', 'setup/calendarList', $Criteria, array (), '' );

G::RenderPage ( 'publishBlank','blank' );

?>