import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Car} from "../../models/car.model";
import {Location} from "@angular/common";
import {BuyerCarsApiService} from "../../services/api/buyer-cars-api.service";
import {BuyerCar} from "../../models/buyer.car";
import {ActivatedRoute} from "@angular/router";
import {AllCarsApiService} from "../../services/api/all-cars-api.service";

function getDefaultForm(): FormGroup {
  return new FormGroup({
    qty: new FormControl(0, [
      Validators.required,
      Validators.min(1),
      Validators.max(10)
    ]),
  });
}

@Component({
  selector: 'app-buyer-dashboard',
  templateUrl: './buyer-dashboard.component.html',
  styleUrls: ['./buyer-dashboard.component.css']
})
export class BuyerDashboardComponent implements OnInit {

  buyerCarsDisplayedColumns: string[] = ['id', 'name', 'qty'];
  allCarsDisplayedColumns: string[] = ['id', 'name', 'qty', 'price'];
  buyerCarsDataSource: BuyerCar[] = [];
  allCarsDataSource: Car[] = [];

  buyCarForm = getDefaultForm();
  selectedCar: Car | null = null;

  constructor(
    private allCarsAPIService: AllCarsApiService,
    private buyerCarsAPIService: BuyerCarsApiService,
    private location: Location,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.getAllAvailableCars();
    this.getBuyerCars();
  }

  errors = {
    qtyHasErrors: () => Boolean(this.buyCarForm.get('qty')?.errors),
    anyErrors: () => this.errors.qtyHasErrors(),

    getForQty: () => {
      const elem = this.buyCarForm.get('qty');
      if (elem?.hasError('required')) {
        return 'You must enter a value';
      }


      if (elem?.hasError('min')) {
        return 'Price must be at least 1';
      }

      if (elem?.hasError('max')) {
        return 'Price must be at most 10';
      }

      return '';
    },
  }

  public getAllAvailableCars(): void {
    // TODO: filter by available
    this.allCarsAPIService.list()
      .then((response: Response) => response.json())
      .then((response: Car[]) => this.allCarsDataSource = response);
  }

  public getBuyerCars(): void {
    this.buyerCarsAPIService.list()
      .then((response: Response) => response.json())
      .then((response: BuyerCar[]) => this.buyerCarsDataSource = response);
  }

  public onSelectCarToBuy(car: Car) {
    console.log(car);
    this.allCarsAPIService.get(car.id)
      .then(response => response.json())
      .then(result => {
        this.selectedCar = new Car(result.id, result.name, result.qty, result.price, result.isAvailable);
      });
  }

  public reset() {
    this.buyCarForm = getDefaultForm();
    this.selectedCar = null;
  }

  public async onBuyCarSubmit(): Promise<void> {
    if (this.errors.anyErrors()) {
      return;
    }

    if (this.selectedCar === null) {
      // TODO: show error
      return;
    }

    if (this.selectedCar.qty < this.buyCarForm.get('qty')?.value) {
      // TODO: show error
      return;
    }

    const newCar = this.buyCarForm.value;
    console.log(newCar);

    const car = await this.allCarsAPIService.get(this.selectedCar.id)
      .then(response => response.json())
      .then(result => new Car(result.id, result.name, result.price, result.qty, result.isAvailable));
    car.changeQty(-newCar.qty);

    const p1 = this.allCarsAPIService
      .update(car.id, car)
      .then(() => this.getAllAvailableCars())

    const p2 = this.buyerCarsAPIService.create({
      name: car.name,
      qty: newCar.qty,
    })
      .then(response => response.json())
      .then(result => {
        this.buyerCarsDataSource.push({
          id: result.id,
          name: result.name,
          qty: result.qty,
        });
        this.buyCarForm = getDefaultForm();
      })
      .then(() => this.getBuyerCars());

    Promise.all([p1, p2]).then(() => this.reset());
  }
}
